// Sidebar Toggle
let sidebarCollapsed = false;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.querySelector('main');
    const toggleIcon = document.getElementById('toggleIcon');
    
    sidebarCollapsed = !sidebarCollapsed;
    
    if (sidebarCollapsed) {
        sidebar.style.width = '64px';
        sidebar.classList.add('collapsed');
        toggleIcon.textContent = 'chevron_right';
        if (main) main.style.marginLeft = '64px';
        // Hide text and content sections
        document.querySelectorAll('.sidebar-text').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.sidebar-content').forEach(el => {
            el.style.display = 'none';
        });
        // Center icons in nav items
        sidebar.querySelectorAll('nav > div').forEach(el => {
            el.style.justifyContent = 'center';
            el.style.padding = '12px';
            el.style.margin = '4px auto';
            el.style.gap = '0';
        });
        // Center footer items
        sidebar.querySelectorAll('.p-2 > div, footer > div').forEach(el => {
            el.style.justifyContent = 'center';
            el.style.padding = '12px';
            el.style.gap = '0';
        });
    } else {
        sidebar.style.width = '';
        sidebar.classList.remove('collapsed');
        toggleIcon.textContent = 'chevron_left';
        if (main) main.style.marginLeft = '';
        // Show text and content sections
        document.querySelectorAll('.sidebar-text').forEach(el => {
            el.style.display = '';
        });
        document.querySelectorAll('.sidebar-content').forEach(el => {
            el.style.display = '';
        });
        // Reset nav item styles
        sidebar.querySelectorAll('nav > div').forEach(el => {
            el.style.justifyContent = '';
            el.style.padding = '';
            el.style.margin = '';
            el.style.gap = '';
        });
        // Reset footer items
        sidebar.querySelectorAll('.p-2 > div, footer > div').forEach(el => {
            el.style.justifyContent = '';
            el.style.padding = '';
            el.style.gap = '';
        });
    }
}
