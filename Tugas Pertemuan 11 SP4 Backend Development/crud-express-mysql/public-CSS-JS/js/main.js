document.addEventListener('DOMContentLoaded', () => {
    // 1. Toast Notifications Dismissal
    const toasts = document.querySelectorAll('.toast');
    toasts.forEach(toast => {
        // Automatically hide toast after 5 seconds
        const dismissTimer = setTimeout(() => {
            dismissToast(toast);
        }, 5000);

        // Close on clicking 'X'
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(dismissTimer);
                dismissToast(toast);
            });
        }
    });

    function dismissToast(toast) {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    // 2. Custom Delete Confirmation Modal
    const deleteForms = document.querySelectorAll('.delete-post-form');
    const modalOverlay = document.getElementById('deleteModalOverlay');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    let activeForm = null;

    if (deleteForms.length > 0 && modalOverlay && confirmDeleteBtn && cancelDeleteBtn) {
        deleteForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault(); // Stop standard immediate form submit
                activeForm = form; // Store the form reference
                modalOverlay.classList.add('active'); // Reveal modal
            });
        });

        // Close Modal on Cancel
        cancelDeleteBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
            activeForm = null;
        });

        // Close Modal if clicking backdrop overlay
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
                activeForm = null;
            }
        });

        // Submit form upon approval
        confirmDeleteBtn.addEventListener('click', () => {
            if (activeForm) {
                modalOverlay.classList.remove('active');
                activeForm.submit();
            }
        });
    }

    // 3. Search Box - Redirection with 500ms Debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let debounceTimer = null;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = e.target.value.trim();
                const currentUrl = new URL(window.location.origin + window.location.pathname);
                
                if (query) {
                    currentUrl.searchParams.set('search', query);
                }
                
                window.location.href = currentUrl.toString();
            }, 500);
        });

        // Autofocus helper: moves cursor to the end of input if populated
        if (searchInput.value) {
            searchInput.focus();
            const originalVal = searchInput.value;
            searchInput.value = '';
            searchInput.value = originalVal;
        }
    }
});
