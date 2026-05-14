import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useAuth } from './authcontext';
import SeverityDisplay from './SeverityDisplay';
// import AlertDialog from '../AlertDialog';

// Separated GeoLocationButton component for better code organization
const GeoLocationButton = ({ onLocationDetected }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationDetected({ lat: latitude, lng: longitude });
        setIsLoading(false);
      },
      (err) => {
        // More user-friendly error messages
        let errorMessage;
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please allow access to your location.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again later.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = `Error getting location: ${err.message}`;
        }
        setError(errorMessage);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onLocationDetected]);

  return (
    <div className="geolocation-control">
      <button 
        className="btn-outline location-btn"
        onClick={detectLocation}
        disabled={isLoading}
      >
        {isLoading ? 'Detecting...' : 'Use My Current Location'} 📍
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};

// Progress Tracker Component - Extracted and improved
const ProgressTracker = ({ activities }) => {
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // Check if the date is today
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if the date is yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise, return the full date
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);
  
  const getStatusClass = useCallback((status) => {
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
  }, []);
  
  const getSeverityClass = useCallback((severity) => {
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
  }, []);

  const getStatusColor = useCallback((status) => {
    switch(status.toLowerCase()) {
      case 'resolved':
        return '#388e3c';
      case 'in progress':
        return '#ffa000';
      case 'assigned':
        return '#1976d2';
      case 'pending':
      default:
        return '#757575';
    }
  }, []);

  const getSeverityColor = useCallback((severity) => {
    switch(severity.toLowerCase()) {
      case 'high':
        return '#d32f2f';
      case 'medium':
        return '#f57c00';
      case 'low':
        return '#4caf50';
      default:
        return '#757575';
    }
  }, []);

  return (
    <div className="recent-activity">
      {activities.length === 0 ? (
        <div className="no-activities">
          <p>No activities to display.</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span className="activity-id" style={{
                fontWeight: 'bold',
                color: 'var(--text-secondary)'
              }}>#{activity.id}</span>
              <span className={`activity-status ${getStatusClass(activity.status)}`} style={{
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.8em',
                backgroundColor: `${getStatusColor(activity.status)}20`,
                color: getStatusColor(activity.status)
              }}>
                {activity.status}
              </span>
            </div>
            
            <div className="activity-content">
              <h4 className="activity-type" style={{
                margin: '0 0 5px 0',
                fontSize: '1.1em',
                color: 'var(--text-primary)'
              }}>{activity.type}</h4>
              <p className="activity-location" style={{
                margin: '0 0 10px 0',
                color: 'var(--text-secondary)',
                fontSize: '0.9em'
              }}>{activity.location}</p>
              <div className="activity-meta" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <span className={`activity-severity ${getSeverityClass(activity.severity)}`} style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8em',
                  backgroundColor: `${getSeverityColor(activity.severity)}20`,
                  color: getSeverityColor(activity.severity)
                }}>
                  {activity.severity} Severity
                </span>
                <span className="activity-time" style={{
                  fontSize: '0.8em',
                  color: 'var(--text-secondary)'
                }}>{formatDate(activity.reportedAt)}</span>
              </div>
            </div>
            
            <div className="activity-footer">
              <span className="activity-reporter" style={{
                fontSize: '0.8em',
                color: 'var(--text-secondary)'
              }}>Reported by: {activity.reportedBy}</span>
              <button className="btn-view-details" style={{
                padding: '5px 10px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '0.8em',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}>View Details</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// Main MapPreview component
const MapPreviewWithGeolocation = () => {
  const [activeTab, setActiveTab] = useState('citizen');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    category: 'pothole',
    priority: 'medium',
    audioText: '',
    reportedBy: '507f1f77bcf86cd799439011'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: '',
    type: 'error'
  });

  const [aiResult, setAiResult] = useState(null);

  const { currentUser } = useAuth() || {};
  
  // Default location (New Delhi)
  const defaultLocation = { lat: 28.6139, lng: 77.2090 };
  
  // These would eventually come from an API call
  const mockIssues = [
    { id: 1, type: "Pothole", severity: "High", status: "In Progress", lat: 40.7128, lng: -74.0060 },
    { id: 2, type: "Broken Pavement", severity: "Medium", status: "Reported", lat: 40.7228, lng: -73.9960 },
    { id: 3, type: "Road Damage", severity: "Low", status: "Resolved", lat: 40.7028, lng: -74.0160 }
  ];

  // Mock activities for Progress Tracker
  const mockActivities = [
    { 
      id: 'CT-2023-001', 
      type: 'Pothole Repair', 
      severity: 'High', 
      status: 'Resolved', 
      location: '123 Broadway, New York', 
      reportedAt: '2025-04-12T10:30:00', 
      reportedBy: 'John Smith' 
    },
    { 
      id: 'CT-2023-002', 
      type: 'Broken Pavement', 
      severity: 'Medium', 
      status: 'In Progress', 
      location: '456 5th Avenue, New York', 
      reportedAt: '2025-04-13T14:15:00', 
      reportedBy: 'Jane Doe' 
    },
    { 
      id: 'CT-2023-003', 
      type: 'Road Damage', 
      severity: 'Low', 
      status: 'Assigned', 
      location: '789 Park Avenue, New York', 
      reportedAt: '2025-04-14T09:20:00', 
      reportedBy: 'Mike Johnson' 
    },
    { 
      id: 'CT-2023-004', 
      type: 'Traffic Light Malfunction', 
      severity: 'High', 
      status: 'Pending', 
      location: '321 Madison Avenue, New York', 
      reportedAt: '2025-04-13T16:45:00', 
      reportedBy: 'Sarah Williams' 
    }
  ];

  // Use environment variable for API key (should be set up in .env file)
  // const { REACT_APP_GOOGLE_MAPS_API_KEY } = process.env;
  // For demo purposes, still using the key in the code but with a note

  // Better error handling for Google Maps loading
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Use default location if user location is not set
  useEffect(() => {
    if (!userLocation) {
      setSelectedLocation(defaultLocation);
    }
    
    // Check if dark mode is active
    const isDark = document.body.classList.contains('dark-mode');
    setIsDarkMode(isDark);
    
    // Add event listener for theme changes
    const handleThemeChange = (mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDarkMode(document.body.classList.contains('dark-mode'));
        }
      }
    };
    
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.body, { attributes: true });
    
    return () => observer.disconnect();
  }, [userLocation]);

  const handleLocationDetected = useCallback((location) => {
    setUserLocation(location);
    setSelectedLocation(location);
    console.log("Location detected:", location);
  }, []);

  const handleMapClick = useCallback((event) => {
    const newLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    setSelectedLocation(newLocation);
  }, []);
  
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  const handleFileChange = useCallback(async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      if (isAutoMode) {
        await analyzeImageWithGemini(file);
      }
    }
  }, [isAutoMode]);
  
  const analyzeImageWithGemini = async (file) => {
    setIsAnalyzing(true);
    try {
      const base64 = await convertImageToBase64(file);
      const base64Data = base64.split(',')[1];
      
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': 'AIzaSyDB8AhMJd6xF9VVURQ_UWVTYJ_gkhUjkAY'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "You are an assistant for civic issue reporting. Analyze the provided image and return ONLY a JSON object with the following format:\n{\n  \"issue_type\": \"choose one: pothole, streetlight, garbage, waterSupply, drainage, roadDamage, publicToilet, parkMaintenance, other\",\n  \"severity\": \"choose one: low, medium, high, critical\",\n  \"title\": \"brief title for the issue\",\n  \"description\": \"short description suitable for government reporting (objective and formal tone)\"\n}"
            }, {
              inline_data: {
                mime_type: file.type,
                data: base64Data
              }
            }]
          }]
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const content = result.candidates[0].content.parts[0].text;
        const jsonMatch = content.match(/\{[^}]+\}/s);
        
        if (jsonMatch) {
          const analysisResult = JSON.parse(jsonMatch[0]);
          
          // Auto-submit in automatic mode
          const compressedImage = await convertImageToBinary(file);
          const payload = {
            title: analysisResult.title || 'Auto-detected issue',
            description: analysisResult.description || 'Issue detected via AI analysis',
            category: analysisResult.issue_type || 'pothole',
            priority: analysisResult.severity || 'medium',
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            address: `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
            audioText: '',
            reportedBy: '507f1f77bcf86cd799439011',
            imageBinary: compressedImage,
            imageFileName: file.name
          };
          
          const submitResponse = await fetch('http://localhost:3013/api/issue/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          if (submitResponse.ok) {
            setAlertState({
              isOpen: true,
              message: 'Issue submitted successfully via AI analysis!',
              type: 'success'
            });
            setSelectedFile(null);
          } else {
            throw new Error('Failed to submit issue');
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAlertState({
        isOpen: true,
        message: 'Error analyzing image. Please try again.',
        type: 'error'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const handleCloseAlert = () => {
    setAlertState({
      ...alertState,
      isOpen: false
    });
  };
  
  // Convert image to base64 string (much smaller than binary array)
  const convertImageToBinary = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Very small dimensions to keep payload tiny
        const maxWidth = 150;
        const maxHeight = 150;
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress heavily
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.3); // Very low quality
        resolve(base64);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  /*for debug*/
  console.log('Form values:', formValues);
  console.log('Selected location:', selectedLocation);
  console.log('Selected file:', selectedFile);
  /*for debug*/
    if (!selectedLocation) {
      setAlertState({
        isOpen: true,
        message: 'Please select a location on the map',
        type: 'error'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert image to binary array if selected
      let imageBinary = null;
      if (selectedFile) {
        imageBinary = await convertImageToBinary(selectedFile);
      }
      
      // Create JSON payload with base64 image
      const payload = {
        title: formValues.title,
        description: formValues.description,
        category: formValues.category,
        priority: formValues.priority,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
        audioText: formValues.audioText,
        reportedBy: formValues.reportedBy,
        imageBinary: imageBinary,
        imageFileName: selectedFile ? selectedFile.name : null
      };
      
      // Debug: Log what we're sending
      console.log('Sending data to backend:', {
        ...payload,
        imageBinary: imageBinary ? `Base64 string (${imageBinary.length} chars)` : null
      });
      
      // Make the API request
      const response = await fetch('http://localhost:3013/api/issue/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const result = await response.text(); // Use text() instead of json() first
        console.log('Response body:', result);
        
        setAlertState({
          isOpen: true,
          message: 'Issue submitted successfully!',
          type: 'success'
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Reset form
      setFormValues({
        title: '',
        description: '',
        category: 'pothole',
        priority: 'medium',
        audioText: '',
        reportedBy: '507f1f77bcf86cd799439011'
      });
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error submitting complaint:', error);
      
      // Handle specific error scenarios
      let errorMessage = error.message || 'An unexpected error occurred';
      
      if (error.message && error.message.toLowerCase().includes('csrf')) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      }
      
      setAlertState({
        isOpen: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate center based on issues or use selected/user location
  const mapCenter = useMemo(() => {
    if (selectedLocation) return selectedLocation;
    if (userLocation) return userLocation;
    
    if (mockIssues.length > 0) {
      return {
        lat: mockIssues.reduce((sum, issue) => sum + issue.lat, 0) / mockIssues.length,
        lng: mockIssues.reduce((sum, issue) => sum + issue.lng, 0) / mockIssues.length,
      };
    }
    
    return defaultLocation;
  }, [selectedLocation, userLocation, mockIssues]);

  // Set fixed height for map and sidebar
  const containerHeight = 400;
  
  const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '4px'
  };

  // Custom map styles for dark mode
  const darkModeMapStyles = useMemo(() => [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ], []);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    fullscreenControl: false,
    styles: isDarkMode ? darkModeMapStyles : []
  }), [isDarkMode, darkModeMapStyles]);

  const getMarkerIcon = useCallback((severity, status) => {
    if (!window.google || !window.google.maps) return null;
    
    let color;
    
    // Set color based on severity
    if (severity === 'High') color = '#FF0000'; // Red
    else if (severity === 'Medium') color = '#FFA500'; // Orange
    else color = '#00CC00'; // Green for Low
    
    // If resolved, change color to blue
    if (status === 'Resolved') color = '#2980b9';
    
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 10
    };
  }, []);

  // Handle errors gracefully
  if (loadError) {
    return (
      <div className="map-error">
        <h3>Error loading maps</h3>
        <p>There was a problem loading Google Maps. Please try again later.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-loading">
        <p>Loading map...</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <section id="report" className="map-preview-section">
      <div className="container">
        <div className="section-header">
          <h2>Interactive Maps for Everyone</h2>
          <p>Seamless experience for both citizens and municipal authorities</p>
          <br/>
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'citizen' ? 'active' : ''}`}
              onClick={() => setActiveTab('citizen')}
            >
              Citizen View
            </button>
            <button 
              className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              Progress Tracker
            </button>
          </div>
        </div>
        
        <div className="map-container">
          {/* Using flexbox for equal heights */}
          <div className="map-interface" style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            height: `${containerHeight}px`,
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            {/* Map takes 60% of the width */}
            <div className="map-placeholder" style={{ 
              position: 'relative', 
              width: '60%', 
              height: '100%'
            }}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={14}
                center={mapCenter}
                options={mapOptions}
                onClick={handleMapClick}
              >
                {/* Display issue markers */}
                {mockIssues.map(issue => (
                  <Marker
                    key={issue.id}
                    position={{ lat: issue.lat, lng: issue.lng }}
                    onClick={() => setSelectedIssue(issue)}
                    icon={getMarkerIcon(issue.severity, issue.status)}
                  />
                ))}
                
                {/* Display user location marker */}
                {userLocation && (
                  <Marker
                    position={{ lat: userLocation.lat, lng: userLocation.lng }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: '#4285F4',
                      fillOpacity: 0.8, 
                      strokeWeight: 3,
                      strokeColor: '#FFFFFF',
                      scale: 12
                    }}
                    title="Your location"
                  />
                )}
                
                {/* Display selected location marker */}
                {selectedLocation && selectedLocation !== userLocation && (
                  <Marker
                    position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: '#00C853',
                      fillOpacity: 0.8,
                      strokeWeight: 2,
                      strokeColor: '#FFFFFF',
                      scale: 10
                    }}
                    title="Selected location"
                  />
                )}
                
                {/* Display info window for selected issue */}
                {selectedIssue && (
                  <InfoWindow
                    position={{ lat: selectedIssue.lat, lng: selectedIssue.lng }}
                    onCloseClick={() => setSelectedIssue(null)}
                  >
                    <div className="info-window" style={{
                      color: '#333', // Keep info window text dark for readability
                      padding: '5px'
                    }}>
                      <h3>{selectedIssue.type}</h3>
                      <p><strong>Status:</strong> {selectedIssue.status}</p>
                      <p><strong>Severity:</strong> {selectedIssue.severity}</p>
                      <button
                        style={{
                          backgroundColor: '#1976d2',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginTop: '5px'
                        }}
                        onClick={() => {
                          setSelectedIssue(null);
                          // Would navigate to issue details page in a real app
                          alert(`Viewing details for issue #${selectedIssue.id}`);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </div>
            
            {/* Sidebar takes 40% of the width */}
            <div className="map-sidebar" style={{ 
              padding: '15px', 
              backgroundColor: 'var(--bg-tertiary)', 
              borderLeft: '1px solid var(--border-color)',
              width: '40%',
              height: '100%',
              overflow: 'auto'
            }}>
              <h3>{activeTab === 'citizen' ? 'Report an Issue' : 'Issue Progress Tracker'}</h3>
              
              {activeTab === 'citizen' ? (
                <div className="citizen-controls">
                  <div className="mode-toggle" style={{ marginBottom: '15px', textAlign: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ color: isAutoMode ? 'var(--text-secondary)' : 'var(--text-primary)' }}>Manual</span>
                      <div className="toggle-switch" style={{ position: 'relative', width: '50px', height: '24px' }}>
                        <input 
                          type="checkbox" 
                          checked={isAutoMode}
                          onChange={(e) => setIsAutoMode(e.target.checked)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span className="toggle-slider" style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: isAutoMode ? 'var(--primary)' : '#ccc',
                          transition: '.4s',
                          borderRadius: '34px'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '16px',
                            width: '16px',
                            left: isAutoMode ? '26px' : '4px',
                            bottom: '4px',
                            backgroundColor: 'white',
                            transition: '.4s',
                            borderRadius: '50%'
                          }}></span>
                        </span>
                      </div>
                      <span style={{ color: isAutoMode ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Automatic</span>
                    </label>
                  </div>
                  
                  {isAutoMode ? (
                    <div className="auto-mode">
                      <GeoLocationButton onLocationDetected={handleLocationDetected} />
                      
                      {selectedLocation && (
                        <div className="location-info" style={{ 
                          margin: '15px 0', 
                          padding: '10px', 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderRadius: '5px',
                          color: 'var(--text-primary)'
                        }}>
                          <p><strong>Selected Location:</strong></p>
                          <p>Lat: {selectedLocation.lat.toFixed(5)}</p>
                          <p>Lng: {selectedLocation.lng.toFixed(5)}</p>
                        </div>
                      )}
                      
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label htmlFor="auto-image">Upload Photo for AI Analysis</label>
                        <input 
                          id="auto-image"
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          style={{ 
                            width: '100%', 
                            marginTop: '5px',
                            color: 'var(--text-primary)'
                          }} 
                        />
                        {isAnalyzing && (
                          <div style={{ 
                            marginTop: '10px', 
                            padding: '10px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '5px',
                            textAlign: 'center',
                            color: 'var(--primary)'
                          }}>
                            🔍 Analyzing image and submitting report...
                          </div>
                        )}
                      </div>
                      
                      <div style={{ 
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '5px',
                        fontSize: '0.9em',
                        color: 'var(--text-secondary)'
                      }}>
                        <p><strong>How it works:</strong></p>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          <li>Select location on map</li>
                          <li>Upload image of the issue</li>
                          <li>AI analyzes and submits automatically</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                  
                  <GeoLocationButton onLocationDetected={handleLocationDetected} />
                  
                  {selectedLocation && (
                    <div className="location-info" style={{ 
                      margin: '15px 0', 
                      padding: '10px', 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderRadius: '5px',
                      color: 'var(--text-primary)'
                    }}>
                      <p><strong>Selected Location:</strong></p>
                      <p>Lat: {selectedLocation.lat.toFixed(5)}</p>
                      <p>Lng: {selectedLocation.lng.toFixed(5)}</p>
                      <p className="location-help" style={{ 
                        fontSize: '0.9em', 
                        fontStyle: 'italic',
                        color: 'var(--text-secondary)'
                      }}>Click elsewhere on the map to change location</p>
                    </div>
                  )}
                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="title">Issue Title</label>
                    <input 
                      id="title"
                      name="title"
                      type="text"
                      value={formValues.title}
                      onChange={handleInputChange}
                      placeholder="Brief description of the issue"
                      required
                      disabled={isAutoMode}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        backgroundColor: isAutoMode ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        opacity: isAutoMode ? 0.7 : 1
                      }}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="category">Category</label>
                    <select 
                      id="category"
                      name="category"
                      value={formValues.category}
                      onChange={handleInputChange}
                      disabled={isAutoMode}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        backgroundColor: isAutoMode ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        opacity: isAutoMode ? 0.7 : 1
                      }}
                    >
                      <option value="pothole">Pothole</option>
                      <option value="streetlight">Street Light</option>
                      <option value="garbage">Garbage</option>
                      <option value="waterSupply">Water Supply</option>
                      <option value="drainage">Drainage</option>
                      <option value="roadDamage">Road Damage</option>
                      <option value="publicToilet">Public Toilet</option>
                      <option value="parkMaintenance">Park Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="priority">Priority</label>
                    <select 
                      id="priority"
                      name="priority"
                      value={formValues.priority}
                      onChange={handleInputChange}
                      disabled={isAutoMode}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        backgroundColor: isAutoMode ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        opacity: isAutoMode ? 0.7 : 1
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="image">Upload Photo {isAutoMode && '(Auto-analysis enabled)'}</label>
                    <input 
                      id="image"
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      style={{ 
                        width: '100%', 
                        marginTop: '5px',
                        color: 'var(--text-primary)'
                      }} 
                    />
                    {isAnalyzing && (
                      <div style={{ marginTop: '5px', color: 'var(--primary)', fontSize: '0.9em' }}>
                        🔍 Analyzing image...
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="description">Description</label>
                    <textarea 
                      id="description"
                      name="description"
                      placeholder="Describe the issue in detail..." 
                      value={formValues.description}
                      onChange={handleInputChange}
                      required
                      disabled={isAutoMode}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px', 
                        minHeight: '80px',
                        backgroundColor: isAutoMode ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        opacity: isAutoMode ? 0.7 : 1
                      }}
                    ></textarea>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="audioText">Audio Notes (Optional)</label>
                    <textarea 
                      id="audioText"
                      name="audioText"
                      placeholder="Additional voice notes or comments" 
                      value={formValues.audioText}
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px', 
                        minHeight: '60px',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    ></textarea>
                  </div>
                  
                  <button 
                    type="submit"
                    className="btn-primary" 
                    disabled={!selectedLocation || isSubmitting}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      backgroundColor: !selectedLocation || isSubmitting ? 'var(--gray)' : 'var(--primary)', 
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: !selectedLocation || isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSubmitting && (
                      <div className="spinner" style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: '50%',
                        borderTopColor: 'white',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    )}
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                    </form>
                  )}
                </div>
              )
              : (
                <div className="progress-tracker-controls">
                  <div className="stats-summary" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    margin: '15px 0', 
                    textAlign: 'center' 
                  }}>
                    <div className="stat" style={{ 
                      padding: '10px', 
                      backgroundColor: isDarkMode ? 'rgba(25, 118, 210, 0.2)' : '#e3f2fd', 
                      borderRadius: '5px', 
                      flex: '1', 
                      margin: '0 5px' 
                    }}>
                      <h4 style={{ 
                        margin: '0', 
                        fontSize: '1.5em', 
                        color: '#1976d2' 
                      }}>24</h4>
                      <p style={{ 
                        margin: '5px 0 0',
                        color: 'var(--text-secondary)' 
                      }}>Open Issues</p>
                    </div>
                    <div className="stat" style={{ 
                      padding: '10px', 
                      backgroundColor: isDarkMode ? 'rgba(255, 160, 0, 0.2)' : '#fff8e1', 
                      borderRadius: '5px', 
                      flex: '1', 
                      margin: '0 5px' 
                    }}>
                      <h4 style={{ margin: '0', fontSize: '1.5em', color: '#ffa000' }}>12</h4>
                      <p style={{ 
                        margin: '5px 0 0',
                        color: 'var(--text-secondary)' 
                      }}>In Progress</p>
                    </div>
                    <div className="stat" style={{ 
                      padding: '10px', 
                      backgroundColor: isDarkMode ? 'rgba(56, 142, 60, 0.2)' : '#e8f5e9', 
                      borderRadius: '5px', 
                      flex: '1', 
                      margin: '0 5px' 
                    }}>
                      <h4 style={{ margin: '0', fontSize: '1.5em', color: '#388e3c' }}>156</h4>
                      <p style={{ 
                        margin: '5px 0 0',
                        color: 'var(--text-secondary)' 
                      }}>Resolved</p>
                    </div>
                  </div>
                  
                  <div className="filter-section" style={{ margin: '15px 0' }}>
                    <label htmlFor="filter">Filter by:</label>
                    <select 
                      id="filter"
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <option value="all">All Activities</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="high">High Severity</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  
                  <div className="activities-container" style={{ height: 'calc(100% - 200px)', overflowY: 'auto' }}>
                    <ProgressTracker activities={mockActivities} />
                  </div>
                </div>
              )}
              {/* Add the SeverityDisplay component here, after the form but still inside the citizen tab content */}
              {activeTab === 'citizen' && aiResult && (
                <div className="severity-result" style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: '5px',
                  border: '1px solid var(--border-color)'
                }}>
                  <SeverityDisplay 
                    severity={aiResult.severity}
                    damageScore={aiResult.damageScore}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Add key information about using the map */}
        <div className="map-help-section" style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>How to use this map:</h4>
          <ul style={{ 
            margin: '0', 
            paddingLeft: '20px',
            fontSize: '0.9em',
            color: 'var(--text-secondary)'
          }}>
            <li>Click anywhere on the map to select a location for your report</li>
            <li>Click on a marker to view details about an existing issue</li>
            <li>Use the "Use My Current Location" button to automatically detect your position</li>
            <li>Switch between tabs to view different perspectives</li>
          </ul>
        </div>
      </div>
      
      {/* Alert Dialog */}
      {alertState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: '10px'
            }}>
              {alertState.type === 'success' ? '✅' : '❌'}
            </div>
            <p style={{
              margin: '0 0 20px 0',
              color: '#333'
            }}>
              {alertState.message}
            </p>
            <button
              onClick={handleCloseAlert}
              style={{
                backgroundColor: alertState.type === 'success' ? '#4CAF50' : '#f44336',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* Add CSS for the spinner animation */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
};

export default MapPreviewWithGeolocation;
