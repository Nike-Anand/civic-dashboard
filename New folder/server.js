const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const reportsDB = [];
const notificationsDB = [];
let reportIdCounter = 1;

app.post('/api/analyze', async (req, res) => {
  try {
    const { image, mimeType, language = 'en', location } = req.body;
    
    const langMap = {
      en: 'English',
      es: 'Spanish',
      hi: 'Hindi',
      fr: 'French',
      de: 'German'
    };
    
    const prompt = `You are a civic infrastructure expert. Analyze this urban image for civic/municipal issues.

Respond in ${langMap[language]} language. Respond ONLY with a raw JSON object — no markdown, no code fences, no explanation. Use this exact structure:
{
  "summary": "2-3 sentence overview of what is visible and the overall condition",
  "overall_severity": "critical|high|medium|low|none",
  "estimated_cost": "Estimated repair cost in INR",
  "priority_score": "1-10 urgency score",
  "issues": [
    {
      "type": "Short issue name (e.g. Blocked Drain, Garbage Dumping, Pothole)",
      "severity": "critical|high|medium|low",
      "description": "Specific description of what is observed",
      "location_hint": "Where in the image this is visible",
      "recommended_action": "What the municipal authority should do to fix this",
      "estimated_time": "Estimated time to fix (e.g., 2-3 days)",
      "department": "Responsible department (e.g., Public Works, Sanitation)"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation for civic authorities"
  ],
  "environmental_impact": "Brief assessment of environmental impact",
  "public_safety_risk": "Brief assessment of public safety risk"
}

Check for: blocked/overflowing drains, garbage/litter dumping, potholes, road damage, sewage overflow, waterlogging/flooding, broken streetlights/poles, illegal construction or encroachments, graffiti/vandalism, open manholes, pollution, missing road markings, broken footpaths, stagnant water, solid waste mismanagement.

If no issues found, use empty issues array and overall_severity "none".`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType, data: image } },
            { text: prompt }
          ]}],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API error');
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Empty response');

    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    
    const report = {
      id: reportIdCounter++,
      timestamp: new Date().toISOString(),
      location: location || 'Unknown',
      coordinates: extractCoordinates(location),
      language,
      status: 'pending',
      ...parsed
    };
    reportsDB.push(report);
    
    // Send notification for critical issues
    if (parsed.overall_severity === 'critical') {
      notificationsDB.push({
        id: Date.now(),
        reportId: report.id,
        message: `Critical issue detected at ${location || 'Unknown location'}`,
        timestamp: new Date().toISOString(),
        read: false
      });
    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports', (req, res) => {
  res.json(reportsDB);
});

app.get('/api/stats', (req, res) => {
  const stats = {
    total_reports: reportsDB.length,
    critical: reportsDB.filter(r => r.overall_severity === 'critical').length,
    high: reportsDB.filter(r => r.overall_severity === 'high').length,
    medium: reportsDB.filter(r => r.overall_severity === 'medium').length,
    low: reportsDB.filter(r => r.overall_severity === 'low').length,
    total_issues: reportsDB.reduce((sum, r) => sum + (r.issues?.length || 0), 0),
    avg_priority: (reportsDB.reduce((sum, r) => sum + (parseInt(r.priority_score) || 0), 0) / reportsDB.length || 0).toFixed(1),
    pending: reportsDB.filter(r => r.status === 'pending').length,
    resolved: reportsDB.filter(r => r.status === 'resolved').length
  };
  res.json(stats);
});

app.get('/api/map-data', (req, res) => {
  const mapData = reportsDB
    .filter(r => r.coordinates)
    .map(r => ({
      id: r.id,
      lat: r.coordinates.lat,
      lng: r.coordinates.lng,
      severity: r.overall_severity,
      summary: r.summary,
      issues: r.issues?.length || 0
    }));
  res.json(mapData);
});

app.get('/api/notifications', (req, res) => {
  res.json(notificationsDB.filter(n => !n.read));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const notification = notificationsDB.find(n => n.id === parseInt(req.params.id));
  if (notification) notification.read = true;
  res.json({ success: true });
});

app.get('/api/analytics/trends', (req, res) => {
  const trends = {
    daily: getDailyTrends(),
    by_severity: getSeverityDistribution(),
    by_department: getDepartmentDistribution(),
    top_issues: getTopIssues()
  };
  res.json(trends);
});

app.get('/api/reports/:id/pdf', async (req, res) => {
  const report = reportsDB.find(r => r.id === parseInt(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found' });
  
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report-${report.id}.pdf`);
  
  doc.pipe(res);
  doc.fontSize(20).text('CivicLens Analysis Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Report ID: ${report.id}`);
  doc.text(`Date: ${new Date(report.timestamp).toLocaleString()}`);
  doc.text(`Location: ${report.location}`);
  doc.text(`Severity: ${report.overall_severity}`);
  doc.moveDown();
  doc.fontSize(14).text('Summary:');
  doc.fontSize(11).text(report.summary);
  doc.moveDown();
  doc.fontSize(14).text('Issues Detected:');
  report.issues?.forEach((issue, i) => {
    doc.fontSize(12).text(`${i + 1}. ${issue.type} (${issue.severity})`);
    doc.fontSize(10).text(`   ${issue.description}`);
  });
  doc.end();
});

app.patch('/api/reports/:id/status', (req, res) => {
  const report = reportsDB.find(r => r.id === parseInt(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found' });
  report.status = req.body.status;
  res.json(report);
});

function extractCoordinates(location) {
  if (!location) return null;
  const match = location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  return null;
}

function getDailyTrends() {
  const last7Days = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    last7Days[key] = 0;
  }
  reportsDB.forEach(r => {
    const date = r.timestamp.split('T')[0];
    if (last7Days[date] !== undefined) last7Days[date]++;
  });
  return last7Days;
}

function getSeverityDistribution() {
  return {
    critical: reportsDB.filter(r => r.overall_severity === 'critical').length,
    high: reportsDB.filter(r => r.overall_severity === 'high').length,
    medium: reportsDB.filter(r => r.overall_severity === 'medium').length,
    low: reportsDB.filter(r => r.overall_severity === 'low').length
  };
}

function getDepartmentDistribution() {
  const depts = {};
  reportsDB.forEach(r => {
    r.issues?.forEach(issue => {
      const dept = issue.department || 'Unassigned';
      depts[dept] = (depts[dept] || 0) + 1;
    });
  });
  return depts;
}

function getTopIssues() {
  const issues = {};
  reportsDB.forEach(r => {
    r.issues?.forEach(issue => {
      issues[issue.type] = (issues[issue.type] || 0) + 1;
    });
  });
  return Object.entries(issues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
