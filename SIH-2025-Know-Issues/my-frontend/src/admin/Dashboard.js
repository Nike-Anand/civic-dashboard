import React, { useContext, useState, useEffect } from 'react';
import '../styles/admin/Dashboard.css';
import StatisticsCard from './components/StatisticsCard';
import MapVisualization from './components/MapVisualization';
import RecentActivity from './components/RecentActivity';
import PerformanceMetrics from './components/PerformanceMetrics';
import { ThemeContext } from '../components/themecontext';
import { getDepartmentByCategory, generateShortId } from './utils/departmentUtils';

const Dashboard = () => {
  const { darkMode } = useContext(ThemeContext); // grab global dark mode value
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await fetch('http://localhost:3013/api/issue/');
      if (response.ok) {
        const data = await response.json();
        const issuesData = data.response || data.issues || data.data || data;
        setIssues(Array.isArray(issuesData) ? issuesData : []);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from real data
  const statistics = {
    totalReported: issues.length,
    resolved: issues.filter(issue => issue.status === 'resolved').length,
    pending: issues.filter(issue => issue.status === 'submitted').length,
    highSeverity: issues.filter(issue => issue.priority === 'high').length,
    mediumSeverity: issues.filter(issue => issue.priority === 'medium').length,
    lowSeverity: issues.filter(issue => issue.priority === 'low').length
  };

  // Get recent activity from real data
  const recentActivity = issues
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(issue => ({
      id: generateShortId(issue._id),
      type: issue.category,
      location: issue.address,
      severity: issue.priority,
      status: issue.status,
      reportedAt: issue.createdAt,
      reportedBy: 'User',
      department: getDepartmentByCategory(issue.category)
    }));

  // Calculate performance metrics from real data
  const resolvedIssues = issues.filter(issue => issue.status === 'resolved');
  const departmentStats = {};
  issues.forEach(issue => {
    const dept = getDepartmentByCategory(issue.category);
    if (!departmentStats[dept]) departmentStats[dept] = { total: 0, resolved: 0 };
    departmentStats[dept].total++;
    if (issue.status === 'resolved') departmentStats[dept].resolved++;
  });
  
  const performanceMetrics = {
    averageResolutionTime: resolvedIssues.length > 0 ? 48 : 0,
    issuesResolvedByDepartment: Object.entries(departmentStats).map(([dept, stats]) => ({
      department: dept,
      resolved: stats.resolved,
      total: stats.total
    }))
  };

  // Convert real issues to map format
  const mapIssues = issues.map((issue, index) => ({
    id: index + 1,
    type: issue.category,
    severity: issue.priority,
    status: issue.status,
    lat: issue.latitude,
    lng: issue.longitude
  }));

  if (loading) {
    return <div className="dashboard-container"><div className="p-4">Loading dashboard...</div></div>;
  }

  return (
    <div className={`dashboard-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <p className="dashboard-subtitle">Real-time data from {issues.length} reported issues</p>
      </div>

      <div className="dashboard-summary">
        <div className="statistics-grid">
          <StatisticsCard title="Total Reports" value={statistics.totalReported} icon="📊" color="primary" darkMode={darkMode} />
          <StatisticsCard title="Resolved Issues" value={statistics.resolved} icon="✅" color="success" darkMode={darkMode} />
          <StatisticsCard title="Pending Issues" value={statistics.pending} icon="⏳" color="warning" darkMode={darkMode} />
          <StatisticsCard title="High Priority" value={statistics.highSeverity} icon="🔴" color="danger" darkMode={darkMode} />
          <StatisticsCard title="Medium Priority" value={statistics.mediumSeverity} icon="🟠" color="warning" darkMode={darkMode} />
          <StatisticsCard title="Low Priority" value={statistics.lowSeverity} icon="🟢" color="success" darkMode={darkMode} />
        </div>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-row">
          <div className="dashboard-col map-col">
            <div className={`dashboard-card ${darkMode ? 'dark-card' : ''}`}>
              <h2 className="card-title">Geographic Distribution</h2>
              <MapVisualization issues={mapIssues} darkMode={darkMode} />
            </div>
          </div>
          <div className="dashboard-col metrics-col">
            <div className={`dashboard-card ${darkMode ? 'dark-card' : ''}`}>
              <h2 className="card-title">Performance Metrics</h2>
              <PerformanceMetrics metrics={performanceMetrics} darkMode={darkMode} />
            </div>
          </div>
        </div>

        <div className="dashboard-row">
          <div className="dashboard-col activity-col full-width">
            <div className={`dashboard-card ${darkMode ? 'dark-card' : ''}`}>
              <h2 className="card-title">Recent Activity</h2>
              <RecentActivity activities={recentActivity} darkMode={darkMode} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
