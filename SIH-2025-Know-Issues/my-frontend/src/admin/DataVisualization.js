import React, { useState, useEffect } from 'react';
import '../styles/Adminglobal.css';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, 
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
         Cell, Label } from 'recharts';
import { getDepartmentByCategory, generateShortId, getDepartmentColor } from './utils/departmentUtils';

const DataVisualization = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVisualization, setActiveVisualization] = useState('categoryDistribution');
  const [chartData, setChartData] = useState(null);
  
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
        generateChartData(issuesData);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateChartData = (issuesData) => {
    const total = issuesData.length;
    
    // Category distribution
    const categoryCount = {};
    issuesData.forEach(issue => {
      categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1;
    });
    const categoryDistribution = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

    // Priority distribution
    const priorityCount = {};
    issuesData.forEach(issue => {
      priorityCount[issue.priority] = (priorityCount[issue.priority] || 0) + 1;
    });
    const severityDistribution = Object.entries(priorityCount).map(([name, value]) => ({ name, value }));

    // Department performance
    const departmentCount = {};
    issuesData.forEach(issue => {
      const dept = getDepartmentByCategory(issue.category);
      if (!departmentCount[dept]) departmentCount[dept] = { assigned: 0, resolved: 0 };
      departmentCount[dept].assigned++;
      if (issue.status === 'resolved') departmentCount[dept].resolved++;
    });
    const departmentPerformance = Object.entries(departmentCount).map(([name, data]) => ({
      name,
      assigned: data.assigned,
      resolved: data.resolved
    }));

    // Status distribution
    const statusCount = {};
    issuesData.forEach(issue => {
      statusCount[issue.status] = (statusCount[issue.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

    setChartData({
      categoryDistribution,
      severityDistribution,
      departmentPerformance,
      statusDistribution
    });
  };
  
  // Colors for charts (consolidated)
  const COLORS = {
    primary: '#4361ee',
    success: '#2ecc71',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#3498db',
    secondary: '#8d99ae',
    severity: {
      'High': '#e74c3c',
      'Medium': '#f39c12',
      'Low': '#3498db'
    }
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  

  
  const VisualizationSelector = () => (
    <div className="visualization-selector">
      <button 
        className={`viz-btn ${activeVisualization === 'categoryDistribution' ? 'active' : ''}`}
        onClick={() => setActiveVisualization('categoryDistribution')}
      >
        Category Distribution
      </button>
      <button 
        className={`viz-btn ${activeVisualization === 'severityDistribution' ? 'active' : ''}`}
        onClick={() => setActiveVisualization('severityDistribution')}
      >
        Priority Distribution
      </button>
      <button 
        className={`viz-btn ${activeVisualization === 'departmentPerformance' ? 'active' : ''}`}
        onClick={() => setActiveVisualization('departmentPerformance')}
      >
        Department Performance
      </button>
      <button 
        className={`viz-btn ${activeVisualization === 'statusDistribution' ? 'active' : ''}`}
        onClick={() => setActiveVisualization('statusDistribution')}
      >
        Status Distribution
      </button>
    </div>
  );
  
  if (loading) {
    return <div className="data-visualization-container"><div className="p-4">Loading visualization data...</div></div>;
  }

  if (!chartData) {
    return <div className="data-visualization-container"><div className="p-4">No data available</div></div>;
  }

  return (
    <div className="data-visualization-container">
      <h1 className="data-visualization-title">Data Visualization</h1>
      <p className="subtitle">Analytics from {issues.length} reported issues</p>
      
      <VisualizationSelector />
      
      <div className="visualization-content">
        
        {activeVisualization === 'severityDistribution' && (
          <div className="visualization-container">
            <h3>Issue Severity Distribution</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData.severityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.severity[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {activeVisualization === 'statusDistribution' && (
          <div className="visualization-container">
            <h3>Issue Status Distribution</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {activeVisualization === 'categoryDistribution' && (
          <div className="visualization-container">
            <h3>Issue Category Distribution</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData.categoryDistribution}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Number of Issues" fill={COLORS.primary}>
                    {chartData.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {activeVisualization === 'departmentPerformance' && (
          <div className="visualization-container">
            <h3>Department Performance</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData.departmentPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="assigned" fill={COLORS.primary} name="Assigned Issues" />
                  <Bar dataKey="resolved" fill={COLORS.success} name="Resolved Issues" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataVisualization;
