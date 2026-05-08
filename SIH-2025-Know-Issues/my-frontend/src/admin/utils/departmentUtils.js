// Department assignment based on issue category
export const getDepartmentByCategory = (category) => {
  const departmentMap = {
    'pothole': 'Road Construction',
    'streetlight': 'Energy Department',
    'garbage': 'Urban Development',
    'waterSupply': 'Water Sanitation',
    'drainage': 'Urban Development',
    'roadDamage': 'Road Construction',
    'publicToilet': 'Water Sanitation',
    'parkMaintenance': 'Urban Development',
    'other': 'Municipal Services'
  };
  
  return departmentMap[category] || 'Municipal Services';
};

// Generate shorter issue ID
export const generateShortId = (mongoId) => {
  if (!mongoId) return 'N/A';
  return `ISS-${mongoId.slice(-6).toUpperCase()}`;
};

// Get department color for UI
export const getDepartmentColor = (department) => {
  const colorMap = {
    'Road Construction': '#e74c3c',
    'Energy Department': '#f39c12',
    'Urban Development': '#3498db',
    'Water Sanitation': '#2ecc71',
    'Municipal Services': '#9b59b6'
  };
  
  return colorMap[department] || '#95a5a6';
};