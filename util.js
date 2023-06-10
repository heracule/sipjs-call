
// Check if the current tab is the active tab
function isActiveTab() {
  return document.visibilityState === 'visible';
}

// Store the connection status in Web Storage
function setConnectionStatus(status) {
  localStorage.setItem('biz-sipjs-client', status);
}

// Get the connection status from Web Storage
function getConnectionStatus() {
  return localStorage.getItem('biz-sipjs-client');
}

// Check if the current tab is the active tab
if (isActiveTab()) {
  // Set the connection status to "connected" in Web Storage
  setConnectionStatus('connected');
} else {
  // If the current tab is not active, check the connection status in Web Storage
  const connectionStatus = getConnectionStatus();

  if (connectionStatus === 'connected') {
    // If the connection is already established in another tab, show "Opened in other tab"
    console.log('Opened in other tab');
  } else {
    // Register and set the connection status to "connected" in Web Storage
    userAgent.register();
    setConnectionStatus('connected');
  }
}

// Handle the page visibility change event
document.addEventListener('visibilitychange', function () {
  if (isActiveTab()) {
    // If the tab becomes active, set the connection status to "connected" in Web Storage
    setConnectionStatus('connected');
  } else {
    // If the tab becomes inactive, set the connection status to "disconnected" in Web Storage
    setConnectionStatus('disconnected');
  }
});
