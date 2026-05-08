import React, { useState, useEffect } from 'react';
import '../styles/Adminglobal.css';
import { getDepartmentByCategory, generateShortId } from './utils/departmentUtils';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:3013/api/issue/');
      if (response.ok) {
        const data = await response.json();
        const issuesData = data.response || data.issues || data.data || data;
        const formattedReports = Array.isArray(issuesData) ? issuesData.map(issue => ({
          id: generateShortId(issue._id),
          mongoId: issue._id,
          type: issue.category,
          location: issue.address,
          severity: issue.priority,
          status: issue.status,
          reportedAt: issue.createdAt,
          reportedBy: 'User',
          assignedTo: getDepartmentByCategory(issue.category),
          images: issue.imageBinary ? [issue.imageBinary] : [],
          description: issue.description,
          aiVerified: false,
          aiSeverity: null,
          upvotes: issue.upvotes || 0,
          coordinates: { lat: issue.latitude, lng: issue.longitude },
          audioText: issue.audioText,
          imageFileName: issue.imageFileName
        })) : [];
        setReports(formattedReports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const [filter, setFilter] = useState({
    severity: '',
    status: '',
    type: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState({});

  // Filter reports based on search and filter criteria
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reportedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filter.severity ? report.severity === filter.severity : true;
    const matchesStatus = filter.status ? report.status === filter.status : true;
    const matchesType = filter.type ? report.type === filter.type : true;
    
    return matchesSearch && matchesSeverity && matchesStatus && matchesType;
  });

  // Get unique values for filters
  const severities = [...new Set(reports.map(report => report.severity))];
  const statuses = [...new Set(reports.map(report => report.status))];
  const types = [...new Set(reports.map(report => report.type))];

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Update report status
  const updateReportStatus = (id, newStatus) => {
    setReports(reports.map(report => {
      if (report.id === id) {
        const updatedReport = { ...report, status: newStatus };
        if (newStatus === 'Resolved') {
          updatedReport.resolvedAt = new Date().toISOString();
          updatedReport.resolutionNotes = resolutionNote;
          setResolutionNote('');
        }
        return updatedReport;
      }
      return report;
    }));
    
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(prev => ({ 
        ...prev, 
        status: newStatus,
        resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : prev.resolvedAt,
        resolutionNotes: newStatus === 'Resolved' ? resolutionNote : prev.resolutionNotes
      }));
    }
  };

  // Assign report to department
  const assignReport = (id, department) => {
    setReports(reports.map(report => {
      if (report.id === id) {
        const updatedReport = { 
          ...report, 
          assignedTo: department,
          status: report.status === 'Pending' ? 'Assigned' : report.status
        };
        return updatedReport;
      }
      return report;
    }));
    
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport(prev => ({ 
        ...prev, 
        assignedTo: department,
        status: prev.status === 'Pending' ? 'Assigned' : prev.status
      }));
    }
  };

  // Get status class for styling
  const getStatusClass = (status) => {
    switch(status.toLowerCase()) {
      case 'resolved':
        return 'status-resolved';
      case 'in progress':
        return 'status-in-progress';
      case 'assigned':
        return 'status-assigned';
      case 'pending':
      default:
        return 'status-pending';
    }
  };
  
  // Get severity class for styling
  const getSeverityClass = (severity) => {
    switch(severity.toLowerCase()) {
      case 'high':
        return 'severity-high';
      case 'medium':
        return 'severity-medium';
      case 'low':
        return 'severity-low';
      default:
        return '';
    }
  };

  // Get marker icon based on severity
  const getMarkerIcon = (severity) => {
    switch(severity.toLowerCase()) {
      case 'high':
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
      case 'medium':
        return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      case 'low':
        return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
      default:
        return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
  };

  // Initialize Google Maps
  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      // Load Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDB8AhMJd6xF9VVURQ_UWVTYJ_gkhUjkAY&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      // Define the callback function
      window.initMap = initializeMap;

      return () => {
        // Clean up
        delete window.initMap;
        document.head.removeChild(script);
      };
    }
  }, [viewMode]);

  // Initialize the map
  const initializeMap = () => {
    if (viewMode !== 'map' || mapLoaded) return;

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Create the map
    const googleMap = new window.google.maps.Map(mapElement, {
      center: { lat: 28.6139, lng: 77.2090 }, // Delhi
      zoom: 14,
      mapTypeControl: true,
      streetViewControl: true,
      zoomControl: true
    });

    setMap(googleMap);
    setMapLoaded(true);

    // Add markers after a small delay to ensure map is fully loaded
    setTimeout(() => addMarkers(googleMap), 100);
  };

  // Add markers to the map
  const addMarkers = (googleMap) => {
    const newMarkers = {};
    const bounds = new window.google.maps.LatLngBounds();

    filteredReports.forEach(report => {
      const marker = new window.google.maps.Marker({
        position: report.coordinates,
        map: googleMap,
        title: `${report.type} - ${report.severity} Severity`,
        icon: getMarkerIcon(report.severity)
      });

      // Info window for the marker
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="map-info-window">
            <h3>${report.type}</h3>
            <p><strong>ID:</strong> ${report.id}</p>
            <p><strong>Location:</strong> ${report.location}</p>
            <p><strong>Status:</strong> ${report.status}</p>
            <p><strong>Severity:</strong> ${report.severity}</p>
            <button id="btn-details-${report.id}" style="padding: 5px 10px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
              View Full Details
            </button>
          </div>
        `
      });

      // Add click event to the marker
      marker.addListener('click', () => {
        // Close any open info windows
        Object.values(newMarkers).forEach(m => {
          if (m.infoWindow && m.infoWindow.getMap()) {
            m.infoWindow.close();
          }
        });

        // Open this info window
        infoWindow.open(googleMap, marker);
        
        // Add click event to the view details button
        setTimeout(() => {
          const detailsButton = document.getElementById(`btn-details-${report.id}`);
          if (detailsButton) {
            detailsButton.addEventListener('click', () => {
              infoWindow.close();
              setSelectedReport(report);
            });
          }
        }, 100);
      });

      // Store the marker and info window
      newMarkers[report.id] = { marker, infoWindow };
      
      // Extend bounds to include this marker
      bounds.extend(report.coordinates);
    });

    // Fit the map to the markers
    if (Object.keys(newMarkers).length > 0) {
      googleMap.fitBounds(bounds);
      
      // Don't zoom in too far
      const listener = window.google.maps.event.addListener(googleMap, 'idle', () => {
        if (googleMap.getZoom() > 16) googleMap.setZoom(16);
        window.google.maps.event.removeListener(listener);
      });
    }

    setMarkers(newMarkers);
  };

  // Clean up markers when filtered reports change
  useEffect(() => {
    if (map && viewMode === 'map') {
      // Remove existing markers
      Object.values(markers).forEach(({ marker }) => {
        marker.setMap(null);
      });
      
      // Add new markers
      addMarkers(map);
    }
  }, [filteredReports, viewMode]);

  // Initialize mini map in report details
  useEffect(() => {
    if (selectedReport && document.getElementById('mini-map')) {
      const miniMap = new window.google.maps.Map(document.getElementById('mini-map'), {
        center: selectedReport.coordinates,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true
      });

      new window.google.maps.Marker({
        position: selectedReport.coordinates,
        map: miniMap,
        icon: getMarkerIcon(selectedReport.severity)
      });
    }
  }, [selectedReport]);

  if (loading) {
    return <div className="report-management-container"><div className="p-4">Loading reports...</div></div>;
  }

  return (
    <div className="report-management-container">
      <h1 className="report-management-title">Report Management</h1>
      <p className="report-count">Managing {reports.length} reported issues</p>
      
      <div className="report-management-actions">
        <div className="search-filter-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search reports by ID, location, or description"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters-container">
            <select 
              value={filter.severity} 
              onChange={(e) => setFilter({...filter, severity: e.target.value})}
              className="filter-select"
            >
              <option value="">All Severities</option>
              {severities.map(severity => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>
            
            <select 
              value={filter.status} 
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            
            <select 
              value={filter.type} 
              onChange={(e) => setFilter({...filter, type: e.target.value})}
              className="filter-select"
            >
              <option value="">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="view-toggle">
          <button 
            className={`btn-view ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 List View
          </button>
          <button 
            className={`btn-view ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            🗺️ Map View
          </button>
        </div>
      </div>
      
      {viewMode === 'list' ? (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Image</th> {/* Added new column for thumbnails */}
                <th>Location</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reported</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.type}</td>
                  <td>
                    {report.images && report.images.length > 0 && (
                      <img 
                        src={report.images[0]} 
                        alt={report.type} 
                        className="report-thumbnail"
                      />
                    )}
                  </td>
                  <td>{report.location}</td>
                  <td>
                    <span className={`severity-indicator ${getSeverityClass(report.severity)}`}>
                      {report.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`status-indicator ${getStatusClass(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>{formatDate(report.reportedAt)}</td>
                  <td>{report.assignedTo || 'Unassigned'}</td>
                  <td className="action-buttons">
                    <button 
                      className="btn-view-details" 
                      onClick={() => setSelectedReport(report)}
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button 
                      className="btn-edit" 
                      onClick={() => setSelectedReport(report)}
                      title="Edit Report"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="reports-map-container">
          <div 
            id="map" 
            style={{ width: '100%', height: '500px', border: '1px solid #ccc', borderRadius: '4px' }}
          ></div>
          
          <div className="map-legend" style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
              <img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="High" width="20" height="20" />
              <span style={{ marginLeft: '5px' }}>High Severity</span>
            </div>
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
              <img src="http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" alt="Medium" width="20" height="20" />
              <span style={{ marginLeft: '5px' }}>Medium Severity</span>
            </div>
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
              <img src="http://maps.google.com/mapfiles/ms/icons/green-dot.png" alt="Low" width="20" height="20" />
              <span style={{ marginLeft: '5px' }}>Low Severity</span>
            </div>
          </div>
        </div>
      )}
      
      {selectedReport && (
        <div className="report-modal-overlay">
          <div className="report-modal">
            <div className="report-modal-header">
              <h2>{selectedReport.id}: {selectedReport.type}</h2>
              <button 
                className="btn-close" 
                onClick={() => setSelectedReport(null)}
              >
                ✕
              </button>
            </div>
            <div className="report-modal-body">
              <div className="report-details">
                <div className="report-image-container">
                  {/* Replace placeholder with actual image display */}
                  {selectedReport.images && selectedReport.images.length > 0 ? (
                    <div className="report-images">
                      {selectedReport.images.map((image, index) => (
                        <div key={index} className="report-image-wrapper">
                          <img 
                            src={image} 
                            alt={`${selectedReport.type} - Image ${index + 1}`}
                            className="report-image"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="report-image-placeholder">
                      No image available
                    </div>
                  )}
                  {selectedReport.aiVerified && (
                    <div className="ai-verification">
                      <span className="ai-badge">AI Verified</span>
                      <span className={`severity-indicator ${getSeverityClass(selectedReport.aiSeverity)}`}>
                        {selectedReport.aiSeverity} Severity
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="report-info">
                  <div className="info-row">
                    <div className="info-label">Status:</div>
                    <div className="info-value">
                      <select 
                        value={selectedReport.status}
                        onChange={(e) => updateReportStatus(selectedReport.id, e.target.value)}
                        className={`status-select ${getStatusClass(selectedReport.status)}`}
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-label">Assigned To:</div>
                    <div className="info-value">
                      <select 
                        value={selectedReport.assignedTo || ''}
                        onChange={(e) => assignReport(selectedReport.id, e.target.value || null)}
                        className="assign-select"
                      >
                        <option value="">Unassigned</option>
                        <option value="Road Construction">Road Construction</option>
                        <option value="Energy Department">Energy Department</option>
                        <option value="Urban Development">Urban Development</option>
                        <option value="Water Sanitation">Water Sanitation</option>
                        <option value="Municipal Services">Municipal Services</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-label">Location:</div>
                    <div className="info-value">{selectedReport.location}</div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-label">Reported By:</div>
                    <div className="info-value">{selectedReport.reportedBy}</div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-label">Reported At:</div>
                    <div className="info-value">{formatDate(selectedReport.reportedAt)}</div>
                  </div>
                  
                  {selectedReport.resolvedAt && (
                    <div className="info-row">
                      <div className="info-label">Resolved At:</div>
                      <div className="info-value">{formatDate(selectedReport.resolvedAt)}</div>
                    </div>
                  )}
                  
                  <div className="info-row">
                    <div className="info-label">Upvotes:</div>
                    <div className="info-value">{selectedReport.upvotes}</div>
                  </div>
                </div>
              </div>
              
              <div className="report-description">
                <h3>Description</h3>
                <p>{selectedReport.description}</p>
              </div>
              
              <div className="report-location-map">
                <h3>Location on Map</h3>
                <div 
                  id="mini-map" 
                  style={{ width: '100%', height: '200px', marginTop: '10px', borderRadius: '4px' }}
                ></div>
              </div>
              
              {selectedReport.resolutionNotes && (
                <div className="resolution-notes">
                  <h3>Resolution Notes</h3>
                  <p>{selectedReport.resolutionNotes}</p>
                </div>
              )}
              
              {selectedReport.status !== 'Resolved' && (
                <div className="resolution-form">
                  <h3>Add Resolution Notes</h3>
                  <textarea 
                    rows="4" 
                    placeholder="Enter details about how this issue was resolved..."
                    className="resolution-textarea"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  ></textarea>
                  <button 
                    className="btn-resolve"
                    onClick={() => updateReportStatus(selectedReport.id, 'Resolved')}
                  >
                    Mark as Resolved
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportManagement;