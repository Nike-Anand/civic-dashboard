import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import ImageUploadPreview from './imageupload';

/**
 * MapPreview Component
 * ---------------------------------------------------------------------
 * This component represents an interactive map preview with a dual-view
 * system: one for citizens and another for municipal authorities. It 
 * utilizes a tab interface to switch between views and displays issue 
 * markers on a Google Map.
 **/
const MapPreview = () => {
  /**
   * State: activeTab
   * ---------------------------------------------------------------------
   * Manages the current active tab ('citizen' or 'authority').
   **/
  const [activeTab, setActiveTab] = useState('citizen');
  
  /**
   * State: selectedIssue
   * ---------------------------------------------------------------------
   * Tracks the currently selected issue (if any).
   **/
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  /**
   * State: Form data matching MongoDB structure
   * ---------------------------------------------------------------------
   * Form state matching Flutter app structure.
   **/
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    latitude: 0,
    longitude: 0,
    address: '',
    audioText: '',
    reportedBy: '507f1f77bcf86cd799439011'
  });
  
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('Detecting location...');
  
  /**
   * Google Maps API Integration
   * ---------------------------------------------------------------------
   * Loads the Google Maps script with the API key.
   **/

  
  /**
   * Mock Data: mockIssues
   * ---------------------------------------------------------------------
   * This array holds sample data representing road issues with properties 
   * such as id, type, severity, status, and coordinates (lat, lng).
   **/
  const mockIssues = [
    { id: 1, type: "Pothole", severity: "High", status: "In Progress", lat: 40.7128, lng: -74.0060 },
    { id: 2, type: "Broken Pavement", severity: "Medium", status: "Reported", lat: 40.7328, lng: -73.9860 },
    { id: 3, type: "Road Damage", severity: "Low", status: "Resolved", lat: 40.7028, lng: -74.0160 }
  ];

  /**
   * Map Configuration
   * ---------------------------------------------------------------------
   * Settings for the Google Map component.
   **/
  const mapContainerStyle = {
    width: '100%',
    height: '500px'
  };
  
  const center = {
    lat: 40.7128,
    lng: -74.0060, // NYC coordinates as example
  };
  
  const options = {
    disableDefaultUI: false,
    zoomControl: true,
  };

  /**
   * Issue categories and priorities matching Flutter app
   **/
  const categories = [
    { value: 'pothole', label: 'Pothole' },
    { value: 'streetlight', label: 'Street Light' },
    { value: 'garbage', label: 'Garbage' },
    { value: 'waterSupply', label: 'Water Supply' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'roadDamage', label: 'Road Damage' },
    { value: 'publicToilet', label: 'Public Toilet' },
    { value: 'parkMaintenance', label: 'Park Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FF9800' },
    { value: 'high', label: 'High', color: '#F44336' },
    { value: 'critical', label: 'Critical', color: '#B71C1C' }
  ];

  const statuses = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude
          }));
          getAddressFromCoordinates(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setCurrentAddress('Location access denied');
        }
      );
    }
  };

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setCurrentAddress(address);
      setFormData(prev => ({
        ...prev,
        address
      }));
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelected = (file) => {
    if (file) {
      setSelectedImages(prev => [...prev, file]);
    }
  };

  const submitReport = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.address.trim()) {
      alert('Please fill in all required fields (Title, Description, and Location)');
      return;
    }
    
    if (formData.latitude === 0 || formData.longitude === 0) {
      alert('Please allow location access or refresh location');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart upload
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('priority', formData.priority);
      submitData.append('latitude', formData.latitude);
      submitData.append('longitude', formData.longitude);
      submitData.append('address', formData.address);
      submitData.append('audioText', formData.audioText);
      submitData.append('reportedBy', formData.reportedBy);
      
      // Add images
      selectedImages.forEach((image, index) => {
        submitData.append('images', image);
      });

      const response = await fetch('http://localhost:3013/api/issue/store', {
        method: 'POST',
        body: submitData, // No Content-Type header for FormData
      });

      if (response.ok) {
        const result = await response.json();
        alert('Issue reported successfully!');
        setFormData({
          title: '',
          description: '',
          category: 'other',
          priority: 'medium',
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address,
          audioText: '',
          reportedBy: '507f1f77bcf86cd799439011'
        });
        setSelectedImages([]);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(`Failed to report issue: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Helper Functions
   * ---------------------------------------------------------------------
   * Functions to determine marker styling based on issue properties.
   **/
  const getMarkerIcon = (severity, status) => {
    if (!isLoaded || !window.google) return null;
    
    let color = '#FF0000'; // Default red for high severity
    
    if (severity === 'Medium') color = '#FFA500'; // Orange
    if (severity === 'Low') color = '#FFFF00'; // Yellow
    if (status === 'Resolved') color = '#00FF00'; // Green for resolved
    
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 10
    };
  };

  /**
   * Render conditionally based on map loading status
   */
  if (loadError) {
    return <div className="map-error">Error loading maps: {loadError.message}</div>;
  }

  /**
   * Component Rendering
   * ---------------------------------------------------------------------
   * Returns the main JSX structure for the map preview section.
   **/
  return (
    <section className="map-preview-section">
      <div className="container">
        <div className="section-header">
          <h2>Interactive Maps for Everyone</h2>
          <p>Seamless experience for both citizens and municipal authorities</p>
          
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'citizen' ? 'active' : ''}`}
              onClick={() => setActiveTab('citizen')}
            >
              Citizen View
            </button>
            <button 
              className={`tab ${activeTab === 'authority' ? 'active' : ''}`}
              onClick={() => setActiveTab('authority')}
            >
              Authority Dashboard
            </button>
          </div>
        </div>
        
        <div className="map-container">
          <div className="map-interface">
            <div className="map-area">
              {!isLoaded ? (
                <div className="loading-map">Loading Map...</div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  zoom={13}
                  center={center}
                  options={options}
                  onClick={() => setSelectedIssue(null)}
                >
                  {/* Render map markers from mock data */}
                  {mockIssues.map(issue => (
                    <Marker
                      key={issue.id}
                      position={{ lat: issue.lat, lng: issue.lng }}
                      onClick={() => setSelectedIssue(issue)}
                      icon={getMarkerIcon(issue.severity, issue.status)}
                      title={`${issue.type} - ${issue.severity} - ${issue.status}`}
                    />
                  ))}
                </GoogleMap>
              )}
            </div>
            
            <div className="map-sidebar">
              <h3>{activeTab === 'citizen' ? 'Report an Issue' : 'Issue Analytics'}</h3>
              
              {activeTab === 'citizen' ? (
                /**
                 * Citizen Controls Section
                 * -----------------------------------------------------------------
                 * Provides a form for citizens to report an issue.
                 **/
                <div className="citizen-controls">
                  <div className="form-group">
                    <label>Issue Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Provide detailed information about the issue"
                      rows="3"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Audio Notes (Optional)</label>
                    <textarea
                      name="audioText"
                      value={formData.audioText}
                      onChange={handleInputChange}
                      placeholder="Additional voice notes or comments"
                      rows="2"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Upload Photos ({selectedImages.length})</label>
                    <ImageUploadPreview onImageSelected={handleImageSelected} />
                    {selectedImages.length > 0 && (
                      <div className="selected-images" style={{marginTop: '10px'}}>
                        {selectedImages.map((image, index) => (
                          <div key={index} style={{display: 'inline-block', margin: '5px', position: 'relative'}}>
                            <img 
                              src={URL.createObjectURL(image)} 
                              alt={`Selected ${index + 1}`}
                              style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}}
                            />
                            <button 
                              type="button"
                              onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                background: 'red',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Location *</label>
                    <p style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>
                      {currentAddress}
                    </p>
                    <p style={{fontSize: '10px', color: '#999', marginBottom: '5px'}}>
                      Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                    <button 
                      type="button" 
                      className="btn-outline"
                      onClick={getCurrentLocation}
                      style={{fontSize: '12px', padding: '4px 8px'}}
                    >
                      Refresh Location
                    </button>
                  </div>
                  
                  <button 
                    className="btn-primary"
                    onClick={submitReport}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              ) : (
                /**
                 * Authority Controls Section
                 * -----------------------------------------------------------------
                 * This section is designed for municipal authorities.
                 **/
                <div className="authority-controls">
                  <div className="stats-summary">
                    <div className="stat">
                      <h4>24</h4>
                      <p>Open Issues</p>
                    </div>
                    <div className="stat">
                      <h4>12</h4>
                      <p>In Progress</p>
                    </div>
                    <div className="stat">
                      <h4>156</h4>
                      <p>Resolved</p>
                    </div>
                  </div>
                  
                  <div className="issue-filter">
                    <label>Filter by:</label>
                    <select>
                      <option>All Issues</option>
                      <option>High Severity</option>
                      <option>Recent Reports</option>
                      <option>Most Voted</option>
                    </select>
                  </div>
                  
                  <div className="issue-list">
                    {mockIssues.map(issue => (
                      <div 
                        key={issue.id} 
                        className={`issue-item ${issue.severity.toLowerCase()}`}
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <span className="issue-type">{issue.type}</span>
                        <span className={`issue-status ${issue.status.toLowerCase().replace(' ', '-')}`}>
                          {issue.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show selected issue details if any */}
              {selectedIssue && (
                <div className="selected-issue-details">
                  <h4>Selected Issue</h4>
                  <p><strong>Type:</strong> {selectedIssue.type}</p>
                  <p><strong>Severity:</strong> {selectedIssue.severity}</p>
                  <p><strong>Status:</strong> {selectedIssue.status}</p>
                  <p><strong>Location:</strong> {selectedIssue.lat.toFixed(4)}, {selectedIssue.lng.toFixed(4)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapPreview;
