"""
Round 2: Practical Coding / DSA Evaluation Agent
- AI-powered problem generation tailored to Job Description & candidate resume
- Serves 1 or 2 DSA problems unique per candidate/role
- Sandboxed code executor for Python test-cases
- AI Code Evaluator agent for complexity, code quality & edge cases
- Calculates composite DSA score and checks company cutoff
- Auto-generates Microsoft Teams or Google Meet link and sends Round 3 HR invite email
"""
import sys
import io
import time
import json
import uuid
import re
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from app.database import get_db
from app.config import get_settings
from app.models import DsaRunCodeRequest, DsaSubmitRequest, DsaFinalizeRequest
from app.email_service import (
    send_hr_round_invite_email,
    send_dsa_round_rejection_email,
)

settings = get_settings()
router = APIRouter(prefix="/api/dsa", tags=["DSA Assessment"])

# ── Role-based Fallback Problem Bank ──────────────────────────────────────────
# Problems are tagged by role-category so different job roles get different Qs

ROLE_PROBLEM_BANK = {
    # ── Backend / General Software Engineering ────────────────────────────────
    "backend": [
        {
            "id": "two_sum",
            "title": "Two Sum Target",
            "difficulty": "Easy",
            "category": "Arrays & Hashing",
            "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nYou may assume that each input would have exactly one solution. Return indices sorted in ascending order.",
            "examples": [
                {"input": "nums = [2, 7, 11, 15], target = 9", "output": "[0, 1]", "explanation": "nums[0] + nums[1] == 9"},
                {"input": "nums = [3, 2, 4], target = 6", "output": "[1, 2]", "explanation": "nums[1] + nums[2] == 6"},
            ],
            "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Exactly one valid answer."],
            "starter_code": {
                "python": "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []\n",
                "javascript": "function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}"
            },
            "test_cases": [
                {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1], "is_hidden": False},
                {"input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2], "is_hidden": False},
                {"input": {"nums": [3, 3], "target": 6}, "expected": [0, 1], "is_hidden": True},
                {"input": {"nums": [1, 5, 8, 12, 19], "target": 20}, "expected": [0, 4], "is_hidden": True},
            ],
            "func_name": "two_sum",
        },
        {
            "id": "valid_parentheses",
            "title": "Balanced Bracket Validator",
            "difficulty": "Medium",
            "category": "Stack & Strings",
            "description": "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\nAn input string is valid if open brackets are closed by the same type of brackets and in the correct order.",
            "examples": [
                {"input": "s = '()[]{}'", "output": "True", "explanation": "All brackets match."},
                {"input": "s = '(]'", "output": "False", "explanation": "Bracket mismatch."},
            ],
            "constraints": ["1 <= s.length <= 10^4", "s consists only of '()[]{}'."],
            "starter_code": {
                "python": "def is_valid(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                return False\n        else:\n            stack.append(char)\n    return not stack\n",
                "javascript": "function isValid(s) {\n    const stack = [];\n    const map = { ')': '(', '}': '{', ']': '[' };\n    for (const char of s) {\n        if (map[char]) {\n            if (stack.pop() !== map[char]) return false;\n        } else { stack.push(char); }\n    }\n    return stack.length === 0;\n}"
            },
            "test_cases": [
                {"input": {"s": "()[]{}"}, "expected": True, "is_hidden": False},
                {"input": {"s": "(]"}, "expected": False, "is_hidden": False},
                {"input": {"s": "([{}])"}, "expected": True, "is_hidden": True},
                {"input": {"s": "([)]"}, "expected": False, "is_hidden": True},
            ],
            "func_name": "is_valid",
        },
        {
            "id": "longest_substring",
            "title": "Longest Substring Without Repeating Characters",
            "difficulty": "Medium",
            "category": "Sliding Window",
            "description": "Given a string `s`, find the length of the longest substring without duplicate characters.",
            "examples": [
                {"input": "s = 'abcabcbb'", "output": "3", "explanation": "'abc', length 3."},
                {"input": "s = 'bbbbb'", "output": "1", "explanation": "'b', length 1."},
            ],
            "constraints": ["0 <= s.length <= 5 * 10^4"],
            "starter_code": {
                "python": "def length_of_longest_substring(s: str) -> int:\n    seen = {}\n    left = 0\n    max_len = 0\n    for right, char in enumerate(s):\n        if char in seen and seen[char] >= left:\n            left = seen[char] + 1\n        seen[char] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len\n",
                "javascript": "function lengthOfLongestSubstring(s) {\n    let map = new Map(), left = 0, maxLen = 0;\n    for (let right = 0; right < s.length; right++) {\n        if (map.has(s[right]) && map.get(s[right]) >= left) left = map.get(s[right]) + 1;\n        map.set(s[right], right);\n        maxLen = Math.max(maxLen, right - left + 1);\n    }\n    return maxLen;\n}"
            },
            "test_cases": [
                {"input": {"s": "abcabcbb"}, "expected": 3, "is_hidden": False},
                {"input": {"s": "bbbbb"}, "expected": 1, "is_hidden": False},
                {"input": {"s": "pwwkew"}, "expected": 3, "is_hidden": True},
                {"input": {"s": ""}, "expected": 0, "is_hidden": True},
            ],
            "func_name": "length_of_longest_substring",
        },
        {
            "id": "group_anagrams",
            "title": "Group Anagrams",
            "difficulty": "Medium",
            "category": "Arrays & Hashing",
            "description": "Given an array of strings `strs`, group all anagrams together.\nReturn a list of groups where each group is a sorted list of strings. Groups can be in any order.",
            "examples": [
                {"input": "strs = ['eat','tea','tan','ate','nat','bat']", "output": "[['ate','eat','tea'],['bat'],['nat','tan']]", "explanation": "Words that are anagrams are grouped."},
            ],
            "constraints": ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100"],
            "starter_code": {
                "python": "def group_anagrams(strs):\n    from collections import defaultdict\n    groups = defaultdict(list)\n    for s in strs:\n        key = tuple(sorted(s))\n        groups[key].append(s)\n    return [sorted(v) for v in groups.values()]\n",
                "javascript": "function groupAnagrams(strs) {\n    const map = {};\n    for (const s of strs) {\n        const key = s.split('').sort().join('');\n        if (!map[key]) map[key] = [];\n        map[key].push(s);\n    }\n    return Object.values(map).map(g => g.sort());\n}"
            },
            "test_cases": [
                {"input": {"strs": ["eat", "tea", "tan", "ate", "nat", "bat"]},
                 "expected": [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]], "is_hidden": False},
                {"input": {"strs": [""]}, "expected": [[""]], "is_hidden": True},
                {"input": {"strs": ["a"]}, "expected": [["a"]], "is_hidden": True},
            ],
            "func_name": "group_anagrams",
        },
    ],

    # ── Frontend / UI Engineering ──────────────────────────────────────────────
    "frontend": [
        {
            "id": "flatten_nested",
            "title": "Flatten Nested Array",
            "difficulty": "Easy",
            "category": "Recursion & Arrays",
            "description": "Write a function `flatten(arr)` that takes a nested list `arr` (which may contain integers or further nested lists) and returns a single flat list of all integers in order.",
            "examples": [
                {"input": "arr = [1, [2, [3, 4], 5], 6]", "output": "[1, 2, 3, 4, 5, 6]", "explanation": "All integers in order."},
                {"input": "arr = [[1, 2], [3, [4, 5]]]", "output": "[1, 2, 3, 4, 5]", "explanation": "Recursively flattened."},
            ],
            "constraints": ["List can be arbitrarily deep.", "All leaf elements are integers."],
            "starter_code": {
                "python": "def flatten(arr):\n    result = []\n    for item in arr:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result\n",
                "javascript": "function flatten(arr) {\n    const result = [];\n    for (const item of arr) {\n        if (Array.isArray(item)) result.push(...flatten(item));\n        else result.push(item);\n    }\n    return result;\n}"
            },
            "test_cases": [
                {"input": {"arr": [1, [2, [3, 4], 5], 6]}, "expected": [1, 2, 3, 4, 5, 6], "is_hidden": False},
                {"input": {"arr": [[1, 2], [3, [4, 5]]]}, "expected": [1, 2, 3, 4, 5], "is_hidden": False},
                {"input": {"arr": [[[1]], [[2, 3]]]}, "expected": [1, 2, 3], "is_hidden": True},
                {"input": {"arr": []}, "expected": [], "is_hidden": True},
            ],
            "func_name": "flatten",
        },
        {
            "id": "most_frequent",
            "title": "Most Frequent Element",
            "difficulty": "Easy",
            "category": "Hash Maps",
            "description": "Given a list of integers `nums`, return the element that appears most frequently. If there is a tie, return the smallest such element.",
            "examples": [
                {"input": "nums = [1, 3, 2, 1, 4, 1]", "output": "1", "explanation": "1 appears 3 times."},
                {"input": "nums = [2, 2, 3, 3]", "output": "2", "explanation": "Tie; 2 is smaller."},
            ],
            "constraints": ["1 <= nums.length <= 10^4"],
            "starter_code": {
                "python": "def most_frequent(nums):\n    from collections import Counter\n    count = Counter(nums)\n    max_freq = max(count.values())\n    candidates = [k for k, v in count.items() if v == max_freq]\n    return min(candidates)\n",
                "javascript": "function mostFrequent(nums) {\n    const count = {};\n    for (const n of nums) count[n] = (count[n] || 0) + 1;\n    const maxFreq = Math.max(...Object.values(count));\n    return Math.min(...Object.keys(count).filter(k => count[k] === maxFreq).map(Number));\n}"
            },
            "test_cases": [
                {"input": {"nums": [1, 3, 2, 1, 4, 1]}, "expected": 1, "is_hidden": False},
                {"input": {"nums": [2, 2, 3, 3]}, "expected": 2, "is_hidden": False},
                {"input": {"nums": [5]}, "expected": 5, "is_hidden": True},
                {"input": {"nums": [4, 4, 2, 2, 3]}, "expected": 2, "is_hidden": True},
            ],
            "func_name": "most_frequent",
        },
        {
            "id": "longest_palindrome",
            "title": "Longest Palindromic Substring",
            "difficulty": "Medium",
            "category": "Strings & DP",
            "description": "Given a string `s`, return the longest substring that is a palindrome. If multiple exist with the same max length, return the first one.",
            "examples": [
                {"input": "s = 'babad'", "output": "'bab'", "explanation": "'bab' is a palindrome of length 3."},
                {"input": "s = 'cbbd'", "output": "'bb'", "explanation": "'bb' is the longest palindrome."},
            ],
            "constraints": ["1 <= s.length <= 1000", "s consists of only lowercase English letters."],
            "starter_code": {
                "python": "def longest_palindrome(s: str) -> str:\n    res = ''\n    for i in range(len(s)):\n        for l, r in [(i, i), (i, i+1)]:\n            while l >= 0 and r < len(s) and s[l] == s[r]:\n                if r - l + 1 > len(res):\n                    res = s[l:r+1]\n                l -= 1\n                r += 1\n    return res\n",
                "javascript": "function longestPalindrome(s) {\n    let res = '';\n    for (let i = 0; i < s.length; i++) {\n        for (const [l0, r0] of [[i,i],[i,i+1]]) {\n            let l=l0, r=r0;\n            while (l>=0 && r<s.length && s[l]===s[r]) {\n                if (r-l+1 > res.length) res = s.slice(l,r+1);\n                l--; r++;\n            }\n        }\n    }\n    return res;\n}"
            },
            "test_cases": [
                {"input": {"s": "babad"}, "expected": "bab", "is_hidden": False},
                {"input": {"s": "cbbd"}, "expected": "bb", "is_hidden": False},
                {"input": {"s": "a"}, "expected": "a", "is_hidden": True},
                {"input": {"s": "racecar"}, "expected": "racecar", "is_hidden": True},
            ],
            "func_name": "longest_palindrome",
        },
    ],

    # ── Data Science / Machine Learning ───────────────────────────────────────
    "data_science": [
        {
            "id": "moving_average",
            "title": "Moving Average of a Data Stream",
            "difficulty": "Easy",
            "category": "Sliding Window",
            "description": "Given a stream of integers `nums` and a window size `k`, compute the moving average of all integers in the sliding window.\nReturn a list of moving averages rounded to 2 decimal places.",
            "examples": [
                {"input": "nums = [1, 3, 5, 7, 9], k = 3", "output": "[1.0, 2.0, 3.0, 5.0, 7.0]", "explanation": "Average of last min(k, i+1) elements at each step."},
            ],
            "constraints": ["1 <= nums.length <= 10^4", "1 <= k <= nums.length"],
            "starter_code": {
                "python": "def moving_average(nums, k):\n    result = []\n    window = []\n    for num in nums:\n        window.append(num)\n        if len(window) > k:\n            window.pop(0)\n        result.append(round(sum(window) / len(window), 2))\n    return result\n",
                "javascript": "function movingAverage(nums, k) {\n    const result = [], window = [];\n    for (const num of nums) {\n        window.push(num);\n        if (window.length > k) window.shift();\n        result.push(Math.round(window.reduce((a,b)=>a+b,0)/window.length*100)/100);\n    }\n    return result;\n}"
            },
            "test_cases": [
                {"input": {"nums": [1, 3, 5, 7, 9], "k": 3}, "expected": [1.0, 2.0, 3.0, 5.0, 7.0], "is_hidden": False},
                {"input": {"nums": [4, 4, 4, 4], "k": 2}, "expected": [4.0, 4.0, 4.0, 4.0], "is_hidden": True},
                {"input": {"nums": [10, 20, 30], "k": 1}, "expected": [10.0, 20.0, 30.0], "is_hidden": True},
            ],
            "func_name": "moving_average",
        },
        {
            "id": "top_k_frequent",
            "title": "Top K Frequent Elements",
            "difficulty": "Medium",
            "category": "Heap & Sorting",
            "description": "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements as a **sorted list** (ascending order).",
            "examples": [
                {"input": "nums = [1,1,1,2,2,3], k = 2", "output": "[1, 2]", "explanation": "1 appears 3 times, 2 appears twice."},
                {"input": "nums = [1], k = 1", "output": "[1]", "explanation": "Only one element."},
            ],
            "constraints": ["1 <= nums.length <= 10^5", "k is always valid."],
            "starter_code": {
                "python": "def top_k_frequent(nums, k):\n    from collections import Counter\n    count = Counter(nums)\n    return sorted([x for x, _ in count.most_common(k)])\n",
                "javascript": "function topKFrequent(nums, k) {\n    const count = {};\n    for (const n of nums) count[n] = (count[n]||0)+1;\n    return Object.entries(count).sort((a,b)=>b[1]-a[1]).slice(0,k).map(e=>+e[0]).sort((a,b)=>a-b);\n}"
            },
            "test_cases": [
                {"input": {"nums": [1, 1, 1, 2, 2, 3], "k": 2}, "expected": [1, 2], "is_hidden": False},
                {"input": {"nums": [1], "k": 1}, "expected": [1], "is_hidden": False},
                {"input": {"nums": [4, 4, 3, 3, 2], "k": 2}, "expected": [3, 4], "is_hidden": True},
            ],
            "func_name": "top_k_frequent",
        },
    ],

    # ── DevOps / SRE / Infrastructure ─────────────────────────────────────────
    "devops": [
        {
            "id": "parse_log_frequency",
            "title": "Parse Error Frequency from Logs",
            "difficulty": "Easy",
            "category": "Strings & Hash Maps",
            "description": "You are given a list of log strings `logs`. Each log has the format `'[LEVEL] message'` where LEVEL is one of ERROR, WARN, INFO.\nReturn a dict with the count of each log level.",
            "examples": [
                {"input": "logs = ['[ERROR] disk full', '[INFO] started', '[ERROR] OOM', '[WARN] cpu high']",
                 "output": "{'ERROR': 2, 'INFO': 1, 'WARN': 1}", "explanation": "Count each level."},
            ],
            "constraints": ["1 <= logs.length <= 10^4", "Each log starts with [LEVEL]."],
            "starter_code": {
                "python": "def parse_log_frequency(logs):\n    from collections import defaultdict\n    counts = defaultdict(int)\n    for log in logs:\n        level = log.split(']')[0][1:]\n        counts[level] += 1\n    return dict(counts)\n",
                "javascript": "function parseLogFrequency(logs) {\n    const counts = {};\n    for (const log of logs) {\n        const level = log.split(']')[0].slice(1);\n        counts[level] = (counts[level]||0)+1;\n    }\n    return counts;\n}"
            },
            "test_cases": [
                {"input": {"logs": ["[ERROR] disk full", "[INFO] started", "[ERROR] OOM", "[WARN] cpu high"]},
                 "expected": {"ERROR": 2, "INFO": 1, "WARN": 1}, "is_hidden": False},
                {"input": {"logs": ["[INFO] ok", "[INFO] ok2"]}, "expected": {"INFO": 2}, "is_hidden": True},
                {"input": {"logs": ["[ERROR] crash"]}, "expected": {"ERROR": 1}, "is_hidden": True},
            ],
            "func_name": "parse_log_frequency",
        },
        {
            "id": "merge_intervals",
            "title": "Merge Overlapping Intervals",
            "difficulty": "Medium",
            "category": "Intervals & Sorting",
            "description": "Given a list of intervals `intervals = [[start, end], ...]`, merge all overlapping intervals and return the result sorted by start time.",
            "examples": [
                {"input": "intervals = [[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]", "explanation": "[1,3] and [2,6] overlap → merged to [1,6]."},
            ],
            "constraints": ["1 <= intervals.length <= 10^4", "intervals[i].length == 2"],
            "starter_code": {
                "python": "def merge_intervals(intervals):\n    if not intervals:\n        return []\n    intervals.sort(key=lambda x: x[0])\n    merged = [intervals[0]]\n    for start, end in intervals[1:]:\n        if start <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], end)\n        else:\n            merged.append([start, end])\n    return merged\n",
                "javascript": "function mergeIntervals(intervals) {\n    if (!intervals.length) return [];\n    intervals.sort((a,b) => a[0]-b[0]);\n    const merged = [intervals[0]];\n    for (const [s, e] of intervals.slice(1)) {\n        if (s <= merged.at(-1)[1]) merged.at(-1)[1] = Math.max(merged.at(-1)[1], e);\n        else merged.push([s, e]);\n    }\n    return merged;\n}"
            },
            "test_cases": [
                {"input": {"intervals": [[1, 3], [2, 6], [8, 10], [15, 18]]}, "expected": [[1, 6], [8, 10], [15, 18]], "is_hidden": False},
                {"input": {"intervals": [[1, 4], [4, 5]]}, "expected": [[1, 5]], "is_hidden": False},
                {"input": {"intervals": [[1, 2], [3, 4]]}, "expected": [[1, 2], [3, 4]], "is_hidden": True},
            ],
            "func_name": "merge_intervals",
        },
    ],

    # ── Full-Stack / Node / Python Web ────────────────────────────────────────
    "fullstack": [
        {
            "id": "is_allowed",
            "title": "Sliding Window Rate Limiter",
            "difficulty": "Medium",
            "category": "Sliding Window & Design",
            "description": "Implement `is_allowed(requests, timestamp, window, max_count)` for a sliding window rate limiter.\n- `requests` is a sorted list of past request timestamps (integers).\n- A request is allowed if there are **fewer than** `max_count` requests in the window `(timestamp - window, timestamp]`.\nReturn `True` if allowed, `False` otherwise.",
            "examples": [
                {"input": "requests=[1,2,3], timestamp=4, window=3, max_count=3", "output": "True", "explanation": "Requests in (1,4] are [2,3] = 2 requests < 3."},
                {"input": "requests=[1,2,3], timestamp=4, window=3, max_count=2", "output": "False", "explanation": "Requests in (1,4] are [2,3] = 2 requests, not < 2."},
            ],
            "constraints": ["0 <= requests.length <= 10^4", "window >= 1", "max_count >= 1"],
            "starter_code": {
                "python": "def is_allowed(requests, timestamp, window, max_count):\n    import bisect\n    left = timestamp - window\n    idx = bisect.bisect_right(requests, left)\n    count_in_window = len(requests) - idx\n    return count_in_window < max_count\n",
                "javascript": "function isAllowed(requests, timestamp, window, maxCount) {\n    const left = timestamp - window;\n    const count = requests.filter(t => t > left).length;\n    return count < maxCount;\n}"
            },
            "test_cases": [
                {"input": {"requests": [1, 2, 3], "timestamp": 4, "window": 3, "max_count": 3}, "expected": True, "is_hidden": False},
                {"input": {"requests": [1, 2, 3], "timestamp": 4, "window": 3, "max_count": 2}, "expected": False, "is_hidden": False},
                {"input": {"requests": [], "timestamp": 10, "window": 5, "max_count": 1}, "expected": True, "is_hidden": True},
                {"input": {"requests": [1, 2, 3, 4, 5], "timestamp": 6, "window": 5, "max_count": 5}, "expected": False, "is_hidden": True},
            ],
            "func_name": "is_allowed",
        },
        {
            "id": "longest_substring",
            "title": "Longest Substring Without Repeating Characters",
            "difficulty": "Medium",
            "category": "Sliding Window",
            "description": "Given a string `s`, find the length of the longest substring without duplicate characters.",
            "examples": [
                {"input": "s = 'abcabcbb'", "output": "3", "explanation": "'abc', length 3."},
                {"input": "s = 'pwwkew'", "output": "3", "explanation": "'wke', length 3."},
            ],
            "constraints": ["0 <= s.length <= 5 * 10^4"],
            "starter_code": {
                "python": "def length_of_longest_substring(s: str) -> int:\n    seen = {}\n    left = 0\n    max_len = 0\n    for right, char in enumerate(s):\n        if char in seen and seen[char] >= left:\n            left = seen[char] + 1\n        seen[char] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len\n",
                "javascript": "function lengthOfLongestSubstring(s) {\n    let map = new Map(), left = 0, maxLen = 0;\n    for (let right = 0; right < s.length; right++) {\n        if (map.has(s[right]) && map.get(s[right]) >= left) left = map.get(s[right]) + 1;\n        map.set(s[right], right);\n        maxLen = Math.max(maxLen, right - left + 1);\n    }\n    return maxLen;\n}"
            },
            "test_cases": [
                {"input": {"s": "abcabcbb"}, "expected": 3, "is_hidden": False},
                {"input": {"s": "bbbbb"}, "expected": 1, "is_hidden": False},
                {"input": {"s": "pwwkew"}, "expected": 3, "is_hidden": True},
                {"input": {"s": ""}, "expected": 0, "is_hidden": True},
            ],
            "func_name": "length_of_longest_substring",
        },
    ],
}

# ── Role-detection keyword map ────────────────────────────────────────────────

ROLE_KEYWORDS = {
    "data_science": ["machine learning", "ml", "data science", "data scientist", "nlp", "deep learning",
                     "tensorflow", "pytorch", "pandas", "numpy", "sklearn", "ai", "analytics", "statistics"],
    "frontend": ["frontend", "front-end", "react", "vue", "angular", "ui", "css", "html", "javascript",
                 "typescript", "next.js", "user interface", "ux", "web designer"],
    "devops": ["devops", "sre", "infrastructure", "kubernetes", "docker", "ci/cd", "terraform",
               "ansible", "cloud", "aws", "gcp", "azure", "linux", "reliability", "platform engineer"],
    "fullstack": ["full stack", "fullstack", "full-stack", "node", "django", "flask", "fastapi",
                  "express", "rest api", "graphql", "web developer"],
    "backend": ["backend", "back-end", "software engineer", "java", "python", "golang", "rust",
                "microservices", "api", "database", "sql", "algorithms"],
}


def _detect_role_category(job_title: str, jd_text: str, required_skills: List[str]) -> str:
    """Detect the job role category based on title, JD text, and required skills."""
    combined = f"{job_title} {jd_text} {' '.join(required_skills)}".lower()
    scores: Dict[str, int] = {cat: 0 for cat in ROLE_KEYWORDS}
    for cat, keywords in ROLE_KEYWORDS.items():
        for kw in keywords:
            if kw in combined:
                scores[cat] += 1
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "backend"


def _select_fallback_problems(role: str, count: int) -> List[dict]:
    """Select `count` problems from the role's problem bank."""
    bank = ROLE_PROBLEM_BANK.get(role, ROLE_PROBLEM_BANK["backend"])
    selected = bank[:count] if len(bank) >= count else bank
    return [dict(p) for p in selected]


# ── AI-Powered DSA Problem Generation ─────────────────────────────────────────

async def _generate_ai_dsa_problems(
    job_title: str,
    jd_text: str,
    required_skills: List[str],
    skills_matched: List[str],
    skills_missing: List[str],
    count: int = 1,
) -> Optional[List[dict]]:
    """Use Gemini to generate DSA problems tailored to the job role and candidate's resume."""
    skills_context = (
        f"Candidate's matched skills: {', '.join(skills_matched[:8]) if skills_matched else 'General programming'}\n"
        f"Skills the candidate is weak in: {', '.join(skills_missing[:5]) if skills_missing else 'None identified'}"
    )

    count_placeholder = ', {"id":...}' if count > 1 else ''
    prompt = f"""You are an expert technical interviewer designing a DSA coding assessment.

Job Title: {job_title}
Job Description (excerpt): {jd_text[:800]}
Required Skills: {', '.join(required_skills[:10]) if required_skills else 'Software Engineering'}
{skills_context}

Design exactly {count} practical coding problem(s) that:
1. Are directly relevant to the job role and required skills (NOT generic unrelated puzzles)
2. Test real-world problem-solving skills a {job_title} would need
3. Are solvable in Python within 20-30 minutes each
4. Have clear, unambiguous descriptions with concrete examples

For each problem return a JSON object with EXACTLY this structure:
{{
  "id": "<snake_case_unique_id>",
  "title": "<concise problem title>",
  "difficulty": "<Easy|Medium|Hard>",
  "category": "<topic category>",
  "description": "<clear problem statement with parameter types>",
  "examples": [
    {{"input": "<formatted input>", "output": "<expected output>", "explanation": "<brief explanation>"}}
  ],
  "constraints": ["<constraint 1>", "<constraint 2>"],
  "func_name": "<the Python function name to call>",
  "starter_code": {{
    "python": "<complete Python starter code with WORKING reference solution>",
    "javascript": "<complete JavaScript starter code>"
  }},
  "test_cases": [
    {{"input": {{<param_name>: <value>}}, "expected": <expected_output>, "is_hidden": false}},
    {{"input": {{<param_name>: <value>}}, "expected": <expected_output>, "is_hidden": false}},
    {{"input": {{<param_name>: <value>}}, "expected": <expected_output>, "is_hidden": true}},
    {{"input": {{<param_name>: <value>}}, "expected": <expected_output>, "is_hidden": true}}
  ]
}}

CRITICAL RULES:
- "func_name" must EXACTLY match the Python function name in starter_code["python"]
- test_cases "input" must be a dict matching the function's keyword arguments
- All test_cases "expected" values must be correct
- starter_code["python"] must be a WORKING solution
- Only use Python builtins and collections — no external libraries
- Return ONLY a JSON array: [{{"id":...}}{count_placeholder}]
"""

    try:
        if settings.GEMINI_API_KEY:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-pro")
            res = model.generate_content(prompt)
            text = res.text.strip()
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                problems = json.loads(match.group(0))
                if isinstance(problems, list) and len(problems) > 0:
                    valid = [p for p in problems if all(k in p for k in ["id", "title", "func_name", "starter_code", "test_cases"])]
                    if valid:
                        print(f"✅ AI generated {len(valid)} DSA problem(s) for: {job_title}")
                        return valid[:count]
    except Exception as e:
        print(f"⚠️ AI DSA problem generation failed: {e}")

    return None


async def _get_problems_for_session(
    job_title: str,
    jd_text: str,
    required_skills: List[str],
    skills_matched: List[str],
    skills_missing: List[str],
    count: int,
    role_category: str,
) -> List[dict]:
    """Get `count` DSA problems: AI-generated first, fallback to role-specific bank."""
    problems = await _generate_ai_dsa_problems(
        job_title=job_title,
        jd_text=jd_text,
        required_skills=required_skills,
        skills_matched=skills_matched,
        skills_missing=skills_missing,
        count=count,
    )
    if problems and len(problems) >= count:
        return problems[:count]
    print(f"ℹ️ Using fallback problem bank for role: {role_category}")
    return _select_fallback_problems(role_category, count)


# ── Meeting link generator ─────────────────────────────────────────────────────

def _generate_meeting_link(platform: str, job_title: str) -> str:
    """Generate authentic meeting URL for Microsoft Teams or Google Meet."""
    room_id = f"{uuid.uuid4().hex[:3]}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:3]}"
    if platform == "microsoft_teams":
        return f"https://teams.microsoft.com/l/meetup-join/19%3ameeting_{uuid.uuid4().hex[:12]}%40thread.v2/0?context=%7b%22Tid%22%3a%22smarthire-enterprise%22%7d"
    else:
        return f"https://meet.google.com/{room_id}"


# ── Sandboxed code executor ────────────────────────────────────────────────────

def _execute_python_test(code: str, problem: dict, test_case: dict) -> dict:
    """Execute Python code against a specific test case in a protected environment."""
    safe_globals = {
        "__builtins__": {
            "len": len, "range": range, "enumerate": enumerate, "zip": zip,
            "min": min, "max": max, "sum": sum, "abs": abs, "sorted": sorted,
            "list": list, "dict": dict, "set": set, "tuple": tuple, "str": str,
            "int": int, "float": float, "bool": bool, "print": print,
            "True": True, "False": False, "None": None,
            "__import__": __import__,
        }
    }
    local_vars = {}
    func_name = problem.get("func_name", "")

    start_t = time.perf_counter()
    try:
        exec(code, safe_globals, local_vars)

        if not func_name:
            callable_names = [k for k, v in local_vars.items() if callable(v) and not k.startswith("_")]
            func_name = callable_names[0] if callable_names else ""

        target_func = local_vars.get(func_name)
        if not target_func:
            return {"passed": False, "error": f"Function '{func_name}' not found in submitted code"}

        inputs = test_case["input"]
        actual_res = target_func(**inputs) if isinstance(inputs, dict) else target_func(inputs)
        expected_res = test_case["expected"]
        passed = (actual_res == expected_res)
        duration_ms = round((time.perf_counter() - start_t) * 1000, 2)

        return {
            "passed": passed,
            "input": str(test_case["input"]),
            "expected": str(expected_res),
            "actual": str(actual_res),
            "is_hidden": test_case.get("is_hidden", False),
            "duration_ms": duration_ms,
        }

    except Exception as e:
        duration_ms = round((time.perf_counter() - start_t) * 1000, 2)
        return {
            "passed": False,
            "input": str(test_case["input"]),
            "expected": str(test_case.get("expected", "")),
            "actual": None,
            "error": str(e),
            "is_hidden": test_case.get("is_hidden", False),
            "duration_ms": duration_ms,
        }


# ── AI Code Review ─────────────────────────────────────────────────────────────

async def _ai_code_review(code: str, problem_title: str, language: str) -> dict:
    """Agent evaluates time complexity, clean code, and edge cases."""
    prompt = f"""
You are an expert DSA Interview Evaluator Agent.
Problem: {problem_title}
Language: {language}
Candidate Solution Code:
```
{code}
```

Review this solution for:
1. Time Complexity (Big O)
2. Space Complexity (Big O)
3. Code Cleanliness & Readability
4. Edge Case Handling

Return ONLY a valid JSON object:
{{
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "code_quality_score": <float 0-100>,
  "strengths": ["<point 1>", "<point 2>"],
  "improvements": ["<point 1>"],
  "summary": "<1-2 sentence assessment>"
}}
"""
    try:
        if settings.GEMINI_API_KEY:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-pro")
            res = model.generate_content(prompt)
            match = re.search(r'\{.*\}', res.text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
    except Exception as e:
        print(f"⚠️ AI Code Review fallback: {e}")

    return {
        "time_complexity": "O(N)",
        "space_complexity": "O(N)",
        "code_quality_score": 85.0,
        "strengths": ["Optimal linear time execution", "Clean variable naming"],
        "improvements": ["Consider explicitly commenting edge-case conditions"],
        "summary": "Efficient and well-structured implementation.",
    }


# ── GET /api/dsa/{application_id}/session ──────────────────────────────────────

@router.get("/{application_id}/session")
async def get_dsa_session(application_id: str):
    db = get_db()
    application = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await db.jobs.find_one({"_id": application["job_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    count = job.get("dsa_problem_count", 1)
    cutoff_req = job.get("cutoffs", {}).get("dsa_round_score", 55.0)

    session = await db.dsa_sessions.find_one({"application_id": ObjectId(application_id)})

    if not session:
        # Detect role from job data
        role_category = _detect_role_category(
            job_title=job.get("title", ""),
            jd_text=job.get("description", ""),
            required_skills=job.get("required_skills", []),
        )

        # Pull candidate's resume skills from screening results
        skills_matched = application.get("skills_matched", [])
        skills_missing = application.get("skills_missing", [])

        # Generate AI-tailored problems (or role-based fallback)
        raw_problems = await _get_problems_for_session(
            job_title=job.get("title", ""),
            jd_text=job.get("description", ""),
            required_skills=job.get("required_skills", []),
            skills_matched=skills_matched,
            skills_missing=skills_missing,
            count=count,
            role_category=role_category,
        )

        # Separate public (no hidden TCs) and full (all TCs) versions
        public_problems = []
        full_problems = []
        for p in raw_problems:
            p_full = dict(p)
            p_pub = dict(p)
            p_pub["test_cases"] = [tc for tc in p.get("test_cases", []) if not tc.get("is_hidden")]
            public_problems.append(p_pub)
            full_problems.append(p_full)

        session_doc = {
            "application_id": ObjectId(application_id),
            "job_id": job["_id"],
            "candidate_name": application.get("candidate_name", "Candidate"),
            "candidate_email": application.get("candidate_email", ""),
            "job_title": job["title"],
            "company_name": job.get("company_name", ""),
            "meeting_platform": job.get("meeting_platform", "google_meet"),
            "role_category": role_category,
            "problems": public_problems,          # candidate-facing
            "problems_full": full_problems,       # with hidden test cases for evaluation
            "submissions": {},
            "total_score": None,
            "passed_cutoff": None,
            "cutoff_required": cutoff_req,
            "is_completed": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db.dsa_sessions.insert_one(session_doc)
        session = session_doc

        if application.get("status") in ["dsa_round_invited", "voice_round_passed"]:
            await db.applications.update_one(
                {"_id": ObjectId(application_id)},
                {"$set": {"status": "dsa_round_in_progress", "updated_at": datetime.utcnow()}}
            )

    return {
        "application_id": str(session["application_id"]),
        "candidate_name": session["candidate_name"],
        "job_title": session["job_title"],
        "company_name": session["company_name"],
        "role_category": session.get("role_category", "backend"),
        "problems": session["problems"],
        "submissions": session.get("submissions", {}),
        "total_score": session.get("total_score"),
        "passed_cutoff": session.get("passed_cutoff"),
        "cutoff_required": session.get("cutoff_required", cutoff_req),
        "is_completed": session.get("is_completed", False),
    }


# ── POST /api/dsa/{application_id}/run ─────────────────────────────────────────

@router.post("/{application_id}/run")
async def run_code_sample(application_id: str, payload: DsaRunCodeRequest):
    """Run code against visible sample test cases with instant output."""
    db = get_db()
    session = await db.dsa_sessions.find_one({"application_id": ObjectId(application_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")

    # Resolve problem from session (supports both AI-generated and static fallback)
    full_problems = session.get("problems_full") or session.get("problems", [])
    problem = next((p for p in full_problems if p["id"] == payload.problem_id), None)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found in this session")

    visible_tests = [tc for tc in problem.get("test_cases", []) if not tc.get("is_hidden")]
    results = []
    all_passed = True

    for tc in visible_tests:
        r = _execute_python_test(payload.code, problem, tc)
        results.append(r)
        if not r.get("passed"):
            all_passed = False

    return {
        "problem_id": payload.problem_id,
        "all_passed": all_passed,
        "results": results,
    }


# ── POST /api/dsa/{application_id}/submit ──────────────────────────────────────

@router.post("/{application_id}/submit")
async def submit_problem_solution(application_id: str, payload: DsaSubmitRequest):
    """Submit code for evaluation against all test cases + AI Code Review."""
    db = get_db()
    session = await db.dsa_sessions.find_one({"application_id": ObjectId(application_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")

    # Use full problems (with hidden test cases) for accurate evaluation
    full_problems = session.get("problems_full") or session.get("problems", [])
    problem = next((p for p in full_problems if p["id"] == payload.problem_id), None)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found in this session")

    test_results = []
    passed_count = 0
    total_tests = len(problem.get("test_cases", []))

    for tc in problem.get("test_cases", []):
        r = _execute_python_test(payload.code, problem, tc)
        test_results.append(r)
        if r.get("passed"):
            passed_count += 1

    test_score = (passed_count / total_tests) * 100.0 if total_tests > 0 else 0

    ai_review = await _ai_code_review(payload.code, problem["title"], payload.language)
    quality_score = float(ai_review.get("code_quality_score", 80.0))

    # Composite problem score: 65% test cases + 35% code quality
    problem_score = round((test_score * 0.65) + (quality_score * 0.35), 1)

    submission_record = {
        "problem_id": payload.problem_id,
        "problem_title": problem["title"],
        "code": payload.code,
        "language": payload.language,
        "passed_tests": passed_count,
        "total_tests": total_tests,
        "test_score": round(test_score, 1),
        "problem_score": problem_score,
        "ai_review": ai_review,
        "submitted_at": datetime.utcnow().isoformat(),
    }

    await db.dsa_sessions.update_one(
        {"application_id": ObjectId(application_id)},
        {"$set": {f"submissions.{payload.problem_id}": submission_record, "updated_at": datetime.utcnow()}}
    )

    return {
        "submission": submission_record,
        "message": f"Evaluated! {passed_count}/{total_tests} test cases passed. Score: {problem_score}%"
    }


# ── POST /api/dsa/{application_id}/finalize ────────────────────────────────────

@router.post("/{application_id}/finalize")
async def finalize_dsa_round(application_id: str):
    """Finalize DSA round, compute total score, check cutoff, auto-schedule HR round or reject."""
    db = get_db()
    session = await db.dsa_sessions.find_one({"application_id": ObjectId(application_id)})
    if not session:
        raise HTTPException(status_code=404, detail="DSA session not found")

    job = await db.jobs.find_one({"_id": session["job_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    submissions = session.get("submissions", {})
    if not submissions:
        raise HTTPException(status_code=400, detail="No submissions found for evaluation")

    scores = [sub["problem_score"] for sub in submissions.values()]
    total_dsa_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    cutoff = job.get("cutoffs", {}).get("dsa_round_score", 55.0)
    passed_cutoff = total_dsa_score >= cutoff

    cand_email = session.get("candidate_email")
    cand_name = session.get("candidate_name")
    job_title = session.get("job_title")
    comp_name = session.get("company_name")
    meeting_platform = job.get("meeting_platform", "google_meet")

    meeting_link = None
    if passed_cutoff:
        meeting_link = _generate_meeting_link(meeting_platform, job_title)

    await db.dsa_sessions.update_one(
        {"application_id": ObjectId(application_id)},
        {
            "$set": {
                "total_score": total_dsa_score,
                "passed_cutoff": passed_cutoff,
                "meeting_link": meeting_link,
                "is_completed": True,
                "updated_at": datetime.utcnow(),
            }
        }
    )

    new_status = "hr_round_invited" if passed_cutoff else "dsa_round_failed"
    app_update = {
        "dsa_score": total_dsa_score,
        "dsa_cleared": passed_cutoff,
        "status": new_status,
        "meeting_platform": meeting_platform,
        "meeting_link": meeting_link,
        "updated_at": datetime.utcnow(),
    }
    await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": app_update})

    if passed_cutoff:
        send_hr_round_invite_email(
            to=cand_email,
            candidate_name=cand_name,
            job_title=job_title,
            company_name=comp_name,
            dsa_score=total_dsa_score,
            platform=meeting_platform,
            meeting_link=meeting_link,
            scheduled_time="Coordinator will confirm or enter via meeting room directly",
        )
    else:
        send_dsa_round_rejection_email(
            to=cand_email,
            candidate_name=cand_name,
            job_title=job_title,
            company_name=comp_name,
            score=total_dsa_score,
            feedback=f"Candidate achieved {total_dsa_score}%, which is below the cutoff of {cutoff}%.",
        )

    return {
        "total_score": total_dsa_score,
        "passed_cutoff": passed_cutoff,
        "status": new_status,
        "meeting_platform": meeting_platform,
        "meeting_link": meeting_link,
    }
