import React, { useState, useEffect } from 'react';

const IssuesList = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await fetch('http://localhost:3013/api/issue/');
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        // Handle different response formats
        if (Array.isArray(data)) {
          setIssues(data);
        } else if (data.response && Array.isArray(data.response)) {
          setIssues(data.response);
        } else if (data.issues && Array.isArray(data.issues)) {
          setIssues(data.issues);
        } else if (data.data && Array.isArray(data.data)) {
          setIssues(data.data);
        } else {
          setIssues([]);
        }
      } else {
        setError('Failed to fetch issues');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading issues...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Reported Issues</h2>
      
      <div className="grid gap-4">
        {Array.isArray(issues) && issues.map((issue) => (
          <div key={issue._id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold">{issue.title}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                issue.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                issue.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {issue.status}
              </span>
            </div>
            
            <p className="text-gray-600 mb-2">{issue.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
              <div>Category: <span className="font-medium">{issue.category}</span></div>
              <div>Priority: <span className="font-medium">{issue.priority}</span></div>
              <div>Location: <span className="font-medium">{issue.address}</span></div>
              <div>Date: <span className="font-medium">{new Date(issue.createdAt).toLocaleDateString()}</span></div>
            </div>

            {issue.audioText && (
              <div className="mb-3">
                <strong>Audio Text:</strong> {issue.audioText}
              </div>
            )}

            {issue.imageBinary && (
              <div className="mb-3">
                <strong>Image:</strong>
                <img 
                  src={issue.imageBinary} 
                  alt={issue.imageFileName || 'Issue image'} 
                  className="mt-2 max-w-xs h-auto border rounded"
                />
              </div>
            )}

            <div className="text-xs text-gray-400">
              ID: {issue._id}
            </div>
          </div>
        ))}
      </div>

      {issues.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No issues reported yet.
        </div>
      )}
    </div>
  );
};

export default IssuesList;