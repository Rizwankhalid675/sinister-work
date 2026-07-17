# -*- coding: utf-8 -*-
"""Renders access-request-brief.md to PDF. Writes only a PDF."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable, ListFlowable, ListItem)
from reportlab.lib.enums import TA_LEFT

OUT = "access-request-brief.pdf"
RED = colors.HexColor("#c0392b")
DARK = colors.HexColor("#1a1a1a")
GREY = colors.HexColor("#666666")
LGREY = colors.HexColor("#f2f2f2")
BORDER = colors.HexColor("#cccccc")

styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=19, textColor=RED, spaceAfter=4, leading=23)
SUB = ParagraphStyle('SUB', parent=styles['Normal'], fontSize=9.5, textColor=GREY, spaceAfter=2, leading=13)
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=13, textColor=DARK, spaceBefore=14, spaceAfter=6, leading=16)
BODY = ParagraphStyle('BODY', parent=styles['Normal'], fontSize=9.6, leading=14, textColor=DARK, alignment=TA_LEFT, spaceAfter=6)
CELL = ParagraphStyle('CELL', parent=styles['Normal'], fontSize=8.4, leading=11.5, textColor=DARK)
CELLB = ParagraphStyle('CELLB', parent=CELL, fontName='Helvetica-Bold')
CELLH = ParagraphStyle('CELLH', parent=CELL, fontName='Helvetica-Bold', textColor=colors.white)
LI = ParagraphStyle('LI', parent=BODY, spaceAfter=3)

story = []

def hr(c=RED, w=1.2):
    story.append(Spacer(1, 5))
    story.append(HRFlowable(width="100%", thickness=w, color=c, spaceBefore=0, spaceAfter=8))

def code(t):
    return '<font face="Courier" size="8.4" color="#c0392b">%s</font>' % t

# Header
story.append(Paragraph("Enshield Dashboard &mdash; Findings &amp; Access Plan", H1))
hr()
story.append(Paragraph("<b>Prepared by:</b> Rizwan Khalid", SUB))
story.append(Paragraph("<b>Date:</b> July 17, 2026", SUB))
story.append(Paragraph("<b>Re:</b> Enabling maintenance &amp; development work on the Enshield admin dashboard", SUB))

# 1. What I found
story.append(Paragraph("1. What I found", H2))
story.append(Paragraph("There are <b>two separate systems</b> in play, and it's important to keep them distinct:", BODY))

hd = [Paragraph("", CELLH),
      Paragraph("Shipping-protection app", CELLH),
      Paragraph("Admin dashboard", CELLH)]
rows = [
    ("URL", code("enshield-shipping-protection.gadget.app") + " (" + code("*.gadget.app") + ")", code("manage.enshield.com/dashboards/main")),
    ("Purpose", "The product/engine &mdash; shipping protection installed into Shopify stores", "The internal cockpit &mdash; Clients, Claims, Errors, Reports"),
    ("Platform", "Gadget (framework v1.5.0), Shopify-connected", "Custom build, hosted on a DigitalOcean server (IP 161.35.190.126)"),
    ("DNS", "Managed by Gadget", "enshield.com via GoDaddy"),
    ("Built by", "In-house (source available locally)", "Insanelab (source not currently in our possession)"),
]
data = [hd]
for label, a, b in rows:
    data.append([Paragraph(label, CELLB), Paragraph(a, CELL), Paragraph(b, CELL)])

t = Table(data, colWidths=[0.85*inch, 2.85*inch, 2.85*inch])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), RED),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LGREY]),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t)
story.append(Spacer(1, 10))

story.append(Paragraph("<b>Verified facts:</b>", BODY))
vf = [
    "The dashboard is live at " + code("manage.enshield.com") + ", resolving to a DigitalOcean server (" + code("161.35.190.126") + ").",
    "DNS for " + code("enshield.com") + " is managed through GoDaddy.",
    "The dashboard's source code is <b>not</b> in our current working repository.",
]
story.append(ListFlowable([ListItem(Paragraph(x, LI), leftIndent=10) for x in vf],
                          bulletType='bullet', start='disc', leftIndent=12))
story.append(Spacer(1, 4))

story.append(Paragraph("<b>Assumptions still to confirm (asked as questions, not asserted):</b>", BODY))
asm = [
    "Which framework/stack the dashboard runs on.",
    "Whether its data syncs from the Gadget/Shopify app or is stored independently.",
    "Who administers the DigitalOcean server and GoDaddy DNS account.",
]
story.append(ListFlowable([ListItem(Paragraph(x, LI), leftIndent=10) for x in asm],
                          bulletType='bullet', start='disc', leftIndent=12))

# 2. What we need
story.append(Paragraph("2. What we need to do the work", H2))
story.append(Paragraph("To maintain, fix, or extend the dashboard we need:", BODY))
need = [
    "<b>Source code</b> &mdash; repository access + setup notes + confirmed stack.",
    "<b>Server access</b> &mdash; SSH/DigitalOcean access and the current deploy method.",
    "<b>Database</b> &mdash; connection details and confirmation of the data source.",
    "<b>DNS/domain</b> &mdash; confirmation of GoDaddy account control.",
    "<b>App logins &amp; config</b> &mdash; admin login(s), " + code(".env") + "/config values, and third-party API keys.",
]
story.append(ListFlowable([ListItem(Paragraph(x, LI), leftIndent=10) for x in need],
                          bulletType='1', leftIndent=14))

# 3. How
story.append(Paragraph("3. How we'll do it", H2))
how = [
    "<b>Gather access</b> (this request) &mdash; collect the items above via a secure vault.",
    "<b>Audit</b> &mdash; stand up the dashboard in a local/staging environment, map the codebase and its data source, and confirm how (or whether) it connects to the Gadget app.",
    "<b>Document</b> &mdash; produce a short architecture + runbook so the two systems are clearly understood and safely deployable.",
    "<b>Execute</b> &mdash; carry out the intended fixes/redesign on staging first, then deploy to production once verified.",
]
story.append(ListFlowable([ListItem(Paragraph(x, LI), leftIndent=10) for x in how],
                          bulletType='1', leftIndent=14))

# 4. Security note
story.append(Paragraph("4. Security note", H2))
story.append(Paragraph(
    "A portal password was recently shared over plain email. Recommendation: <b>rotate that password "
    "after handover</b> and move all future credential sharing to a secure vault (1Password / Bitwarden). "
    "No credentials should be sent in plain text.", BODY))

doc = SimpleDocTemplate(OUT, pagesize=letter,
                        leftMargin=0.9*inch, rightMargin=0.9*inch,
                        topMargin=0.8*inch, bottomMargin=0.8*inch,
                        title="Enshield Dashboard - Findings & Access Plan",
                        author="Rizwan Khalid")
doc.build(story)
print("wrote", OUT)
