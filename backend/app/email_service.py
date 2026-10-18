import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.config import get_settings

settings = get_settings()


def _send_smtp(to: str, subject: str, html_body: str):
    """Low-level SMTP sender using Gmail or simulated logging fallback."""
    if not settings.SMTP_USER or not settings.SMTP_PASS or settings.SMTP_USER == "your-gmail@gmail.com":
        print(f"📧 [SIMULATED EMAIL LOG] -> To: {to} | Subject: {subject}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to

        part = MIMEText(html_body, "html")
        msg.attach(part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())
            print(f"✅ Real email successfully sent to {to} | Subject: {subject}")
    except Exception as e:
        print(f"⚠️ SMTP error while sending to {to}: {e}. Falling back to simulation.")


def _base_template(title: str, body: str, cta_url: str = "", cta_text: str = "") -> str:
    cta_html = ""
    if cta_url and cta_text:
        cta_html = f"""
        <div style="text-align:center; margin:32px 0;">
          <a href="{cta_url}" style="
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white; padding: 14px 32px; border-radius: 8px;
            text-decoration: none; font-weight: 600; font-size: 16px;
            display: inline-block; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
            {cta_text}
          </a>
        </div>"""

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0; padding:0; background:#0f0f1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding: 40px 16px;">
          <table width="600" cellpadding="0" cellspacing="0" style="
            background: #1a1a2e; border-radius: 16px;
            border: 1px solid #2d2d4e; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">

            <!-- Header -->
            <tr><td style="
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                🚀 PrismHire AI
              </h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
                Autonomous Intelligent Recruitment Platform
              </p>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding: 40px 32px;">
              <h2 style="color: #f1f5f9; font-size: 22px; margin-top: 0; margin-bottom: 20px;">{title}</h2>
              {body}
              {cta_html}
            </td></tr>

            <!-- Footer -->
            <tr><td style="
              background: #111124; padding: 24px 32px;
              border-top: 1px solid #2d2d4e; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.6;">
                This automated dispatch was processed by PrismHire AI Pipeline.<br/>
                Empowered by Multi-Round Evaluation Agents.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


# ── Step 0: Initial Invite to Apply ──────────────────────────────────────────

def send_resume_invite_email(to: str, candidate_name: str, job_title: str, company_name: str, apply_link: str):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Dear <strong style="color: #e2e8f0;">{candidate_name}</strong>,
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      You have been invited to apply for the position of
      <strong style="color: #a78bfa;">{job_title}</strong> at
      <strong style="color: #e2e8f0;">{company_name}</strong>.
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Please submit your resume through our portal. Our AI evaluation engine will parse your skills,
      experience, and project relevance against the job benchmarks in real-time.
    </p>
    """
    html = _base_template(f"Application Invitation: {job_title}", body, apply_link, "Upload Resume & Apply →")
    _send_smtp(to, f"🎯 Application Invite — {job_title} at {company_name}", html)


# ── Step 1: Resume Screen Rejection ──────────────────────────────────────────

def send_resume_rejection_email(to: str, candidate_name: str, job_title: str, company_name: str, score: float, feedback: str):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Dear <strong style="color: #e2e8f0;">{candidate_name}</strong>,
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Thank you for your interest in the <strong style="color: #a78bfa;">{job_title}</strong> role
      at <strong style="color: #e2e8f0;">{company_name}</strong>.
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Following AI resume screening against the role criteria, your match score did not meet the cutoff threshold for Round 1.
    </p>
    <div style="background:#1e1e3a; border-radius:12px; padding:20px; margin:20px 0;">
      <h3 style="color:#e2e8f0; margin-top:0;">📊 Resume Screening Summary</h3>
      <div style="background:#0f0f1a; border-radius:8px; padding:12px; margin:8px 0;">
        <div style="background: linear-gradient(90deg, #ef4444 {score}%, #2d2d4e {score}%);
          height:8px; border-radius:4px; margin-bottom:8px;"></div>
        <p style="color:#94a3b8; margin:0; font-size:13px;">Match Score: <strong style="color:#f87171;">{score:.1f}%</strong></p>
      </div>
      <p style="color:#94a3b8; font-size:13px; margin-bottom:0;"><strong style="color:#e2e8f0;">AI Feedback:</strong> {feedback}</p>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7;">
      We encourage you to explore future roles as your skills expand. We wish you great success!
    </p>
    """
    html = _base_template(f"Application Status — {job_title}", body)
    _send_smtp(to, f"Application Status — {job_title} at {company_name}", html)


# ── Step 2: Round 1 Voice Interview Invite ───────────────────────────────────

def send_voice_round_invite_email(to: str, candidate_name: str, job_title: str, company_name: str,
                                   score: float, voice_link: str):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Congratulations, <strong style="color: #e2e8f0;">{candidate_name}</strong>! 🎉
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Your resume scored <strong style="color: #34d399;">{score:.1f}%</strong> and cleared the cutoff for
      <strong style="color: #a78bfa;">{job_title}</strong> at
      <strong style="color: #e2e8f0;">{company_name}</strong>!
    </p>
    <div style="background:#16213e; border-radius:12px; padding:20px; margin:20px 0; border-left:4px solid #10b981;">
      <h4 style="color:#e2e8f0; margin:0 0 10px; font-size: 16px;">🎤 Round 1: AI Adaptive Voice Interview</h4>
      <p style="color:#94a3b8; font-size:14px; margin-bottom: 10px;">
        Our conversational voice bot will conduct your interview across <strong>3 Adaptive Tiers</strong>:
      </p>
      <ul style="color:#cbd5e1; font-size:13px; margin:0; padding-left:20px; line-height: 1.8;">
        <li>🟢 <strong>Level 1 (Easy):</strong> Core technical concepts & fundamentals</li>
        <li>🟡 <strong>Level 2 (Medium):</strong> Applied scenarios & system behaviors</li>
        <li>🔴 <strong>Level 3 (Hard):</strong> Architecture, optimization & trade-off decisions</li>
      </ul>
      <p style="color:#94a3b8; font-size:12px; margin-top:12px; margin-bottom:0;">
        💡 Please allow microphone permissions and be in a quiet room.
      </p>
    </div>
    """
    html = _base_template("🎤 Round 1: AI Voice Interview Invitation", body, voice_link, "Start Voice Interview Now →")
    _send_smtp(to, f"🎉 Round 1 Voice Interview Invite — {job_title} at {company_name}", html)


# ── Step 3: Round 1 Voice Rejection ──────────────────────────────────────────

def send_voice_round_rejection_email(to: str, candidate_name: str, job_title: str, company_name: str,
                                     score: float, feedback: str):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Dear <strong style="color: #e2e8f0;">{candidate_name}</strong>,
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Thank you for participating in Round 1 (AI Voice Interview) for the
      <strong style="color: #a78bfa;">{job_title}</strong> role at
      <strong style="color: #e2e8f0;">{company_name}</strong>.
    </p>
    <div style="background:#1e1e3a; border-radius:12px; padding:20px; margin:20px 0;">
      <h3 style="color:#e2e8f0; margin-top:0;">📊 Voice Interview Performance</h3>
      <div style="background:#0f0f1a; border-radius:8px; padding:12px; margin:8px 0;">
        <div style="background: linear-gradient(90deg, #f59e0b {score}%, #2d2d4e {score}%);
          height:8px; border-radius:4px; margin-bottom:8px;"></div>
        <p style="color:#94a3b8; margin:0; font-size:13px;">Voice Score: <strong style="color:#fbbf24;">{score:.1f}%</strong></p>
      </div>
      <p style="color:#94a3b8; font-size:13px; margin-bottom:0;"><strong style="color:#e2e8f0;">Interview Feedback:</strong> {feedback}</p>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7;">
      Unfortunately, the score fell short of the company cutoff for Round 2. We appreciate your time and dedication.
    </p>
    """
    html = _base_template(f"Voice Interview Feedback — {job_title}", body)
    _send_smtp(to, f"Round 1 Feedback — {job_title} at {company_name}", html)


# ── Step 4: Round 2 DSA / Practical Coding Invite ────────────────────────────

def send_dsa_round_invite_email(to: str, candidate_name: str, job_title: str, company_name: str,
                                voice_score: float, dsa_link: str, problem_count: int = 1):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Outstanding performance, <strong style="color: #e2e8f0;">{candidate_name}</strong>! 🌟
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      You cleared Round 1 (Voice Interview) with an impressive score of
      <strong style="color: #34d399;">{voice_score:.1f}%</strong>!
    </p>
    <div style="background:#16213e; border-radius:12px; padding:20px; margin:20px 0; border-left:4px solid #6366f1;">
      <h4 style="color:#e2e8f0; margin:0 0 10px; font-size: 16px;">💻 Round 2: Practical Coding / DSA Assessment</h4>
      <p style="color:#94a3b8; font-size:14px; margin-bottom: 10px;">
        You have qualified for Round 2. This round tests your hands-on problem-solving and algorithmic thinking.
      </p>
      <ul style="color:#cbd5e1; font-size:13px; margin:0; padding-left:20px; line-height: 1.8;">
        <li>⚡ <strong>Number of Problems:</strong> {problem_count} practical coding challenge(s)</li>
        <li>⚙️ <strong>Evaluation:</strong> Real-time test-case validator + AI Code Quality Agent</li>
        <li>⏱️ <strong>Languages Supported:</strong> Python, JavaScript, Java, C++</li>
      </ul>
    </div>
    """
    html = _base_template("💻 Round 2: Practical Coding Assessment Invite", body, dsa_link, "Enter Coding Arena →")
    _send_smtp(to, f"🚀 Round 2 Coding Challenge Invite — {job_title} at {company_name}", html)


# ── Step 5: Round 2 DSA Rejection ────────────────────────────────────────────

def send_dsa_round_rejection_email(to: str, candidate_name: str, job_title: str, company_name: str,
                                   score: float, feedback: str):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Dear <strong style="color: #e2e8f0;">{candidate_name}</strong>,
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Thank you for attempting Round 2 (Coding / DSA Assessment) for the
      <strong style="color: #a78bfa;">{job_title}</strong> position at
      <strong style="color: #e2e8f0;">{company_name}</strong>.
    </p>
    <div style="background:#1e1e3a; border-radius:12px; padding:20px; margin:20px 0;">
      <h3 style="color:#e2e8f0; margin-top:0;">📊 Coding Assessment Result</h3>
      <div style="background:#0f0f1a; border-radius:8px; padding:12px; margin:8px 0;">
        <div style="background: linear-gradient(90deg, #ef4444 {score}%, #2d2d4e {score}%);
          height:8px; border-radius:4px; margin-bottom:8px;"></div>
        <p style="color:#94a3b8; margin:0; font-size:13px;">Code Test Score: <strong style="color:#f87171;">{score:.1f}%</strong></p>
      </div>
      <p style="color:#94a3b8; font-size:13px; margin-bottom:0;"><strong style="color:#e2e8f0;">Reviewer Notes:</strong> {feedback}</p>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7;">
      While you performed admirably, this round required meeting the specific passing cutoff. Keep honing your algorithms!
    </p>
    """
    html = _base_template(f"Coding Assessment Update — {job_title}", body)
    _send_smtp(to, f"Round 2 Update — {job_title} at {company_name}", html)


# ── Step 6: Round 3 HR Video Interview Invite (Teams / Google Meet) ──────────

def send_hr_round_invite_email(to: str, candidate_name: str, job_title: str, company_name: str,
                               dsa_score: float, platform: str, meeting_link: str,
                               scheduled_time: Optional[str] = None):
    platform_name = "Microsoft Teams" if platform == "microsoft_teams" else "Google Meet"
    icon = "🔷" if platform == "microsoft_teams" else "🟢"
    date_display = scheduled_time if scheduled_time else "Scheduled by HR Coordinator (Check link for details)"

    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Congratulations, <strong style="color: #e2e8f0;">{candidate_name}</strong>! 🏆
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      You have successfully passed both the AI Voice Interview and the DSA Coding Assessment!
      Your coding score was <strong style="color: #34d399;">{dsa_score:.1f}%</strong>.
    </p>
    <div style="background:#16213e; border-radius:12px; padding:20px; margin:20px 0; border-left:4px solid #8b5cf6;">
      <h4 style="color:#e2e8f0; margin:0 0 10px; font-size: 16px;">👔 Final Round: HR & Culture Fit Discussion</h4>
      <p style="color:#94a3b8; font-size:14px; margin-bottom: 12px;">
        As per {company_name}'s hiring requirements, your final discussion will be hosted via <strong>{icon} {platform_name}</strong>.
      </p>
      <div style="background:#0d1117; padding:12px 16px; border-radius:8px; margin-bottom:12px;">
        <p style="color:#94a3b8; margin:0 0 6px; font-size:13px;">📅 <strong>Schedule / Timing:</strong> {date_display}</p>
        <p style="color:#94a3b8; margin:0; font-size:13px;">🔗 <strong>Meeting Platform:</strong> {platform_name}</p>
      </div>
      <p style="color:#cbd5e1; font-size:13px; margin:0;">
        Please join 5 minutes early, test your camera & audio, and be ready to discuss your past projects and aspirations.
      </p>
    </div>
    """
    html = _base_template(f"🎉 Final HR Round Invite — {job_title}", body, meeting_link, f"Join {platform_name} Meeting →")
    _send_smtp(to, f"🎉 Shortlisted for Final HR Round! — {job_title} at {company_name}", html)


# ── Step 7: Final Selection & Offer Letter ───────────────────────────────────

def send_selection_email(to: str, candidate_name: str, job_title: str, company_name: str, final_score: float):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Dear <strong style="color: #e2e8f0;">{candidate_name}</strong>,
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      We are thrilled to inform you that you have been
      <strong style="color: #10b981; font-size: 17px;">OFFICIALLY SELECTED</strong> for the position of
      <strong style="color: #a78bfa;">{job_title}</strong> at
      <strong style="color: #e2e8f0;">{company_name}</strong>! 🎊
    </p>
    <div style="background:#1e1e3a; border-radius:12px; padding:20px; margin:20px 0; border: 1px solid #10b981;">
      <h3 style="color:#e2e8f0; margin-top:0;">🏆 Final Composite Evaluation</h3>
      <div style="background:#0f0f1a; border-radius:8px; padding:16px;">
        <div style="background: linear-gradient(90deg, #10b981 {final_score}%, #2d2d4e {final_score}%);
          height:12px; border-radius:6px; margin-bottom:10px;"></div>
        <p style="color:#94a3b8; margin:0; font-size:14px;">
          Comprehensive Multi-Round Score: <strong style="color:#34d399; font-size:22px;">{final_score:.1f}%</strong>
        </p>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      The talent operations team will contact you shortly regarding the formal offer contract, compensation package, and onboarding roadmap.
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Welcome to the team! 🚀
    </p>
    """
    html = _base_template("🎊 Congratulations — Job Offer Extended!", body)
    _send_smtp(to, f"🎊 OFFICIAL OFFER EXTENDED — {job_title} at {company_name}", html)


# ── Step 8: Final HR Round Rejection ─────────────────────────────────────────

def send_final_rejection_email(to: str, candidate_name: str, job_title: str, company_name: str, final_score: float):
    body = f"""
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Dear <strong style="color: #e2e8f0;">{candidate_name}</strong>,
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      Thank you for meeting with our team during the final HR round for the
      <strong style="color: #a78bfa;">{job_title}</strong> position at
      <strong style="color: #e2e8f0;">{company_name}</strong>.
    </p>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7;">
      After careful consideration of the holistic evaluation results across all rounds,
      we have decided to proceed with other candidates whose profiles more closely fit our immediate needs.
    </p>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7;">
      You demonstrated great talent and resolve throughout this rigorous hiring process.
      We will maintain your record in our talent network for upcoming opportunities.
    </p>
    """
    html = _base_template(f"Interview Outcome — {job_title}", body)
    _send_smtp(to, f"Interview Outcome — {job_title} at {company_name}", html)
