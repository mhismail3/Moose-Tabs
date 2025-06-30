// Settings page initialization script

// Show body once loaded
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');
});

// Hide loading once React app mounts
window.hideLoading = () => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
};