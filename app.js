// 🧬 BIBLIOTECA DE ALEJANDRÍA - ENGINE v1.0
// Client-side controller for research browsing and modal display.

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let articles = [];
    let currentCategory = 'all';
    let searchQuery = '';

    // DOM Elements
    const grid = document.getElementById('articles-grid');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterTabsContainer = document.getElementById('filter-tabs');
    const statsCount = document.getElementById('stats-count');
    
    // Modal DOM Elements
    const modal = document.getElementById('article-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalCategory = document.getElementById('modal-category');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalId = document.getElementById('modal-id');
    const modalLearning = document.getElementById('modal-learning');
    const modalPossibilities = document.getElementById('modal-possibilities');
    const relatedGrid = document.getElementById('related-grid');

    // Default seed papers (Fallback if catalog.json is empty or not found)
    const SEED_DATA = [
        {
            id: 1781700000,
            category: "neuro-sovereignty",
            title: "Declaración de Soberanía Biofísica y Canales de Mecanotransducción PIEZO1/2",
            date: "2026-06-10",
            learning: "Consolidación de protocolos de ingeniería cognitiva humana (IC-H) como 'prior art' científico frente a patentes corporativas en interfaces neuronales. Se demuestra la viabilidad de estimulación piezoeléctrica controlada en entornos locales.",
            possibilities: "Implementar puentes de hardware piezo-resistivos en el arsenal Ebitengine y modelado VNS en Godot.",
            related_ids: [1781700001, 1781700002]
        },
        {
            id: 1781700001,
            category: "sovereign-ai",
            title: "Despliegue Asíncrono de Inferencia Local en Arquitecturas NixOS Embebidas",
            date: "2026-06-12",
            learning: "Establecimiento del loop autónomo de 48 horas en NixOS (Nodo Beta) sin telemetría corporativa. Optimización de la recolección de basura del nix-store en ciclos de procesamiento intensivo de modelos de lenguaje.",
            possibilities: "Escalar orquestación hacia clústeres local-first sobre redes Tailscale malladas.",
            related_ids: [1781700000, 1781700003]
        },
        {
            id: 1781700002,
            category: "biological-autonomy",
            title: "Protocolo Clínico de Síntesis e Interacción Farmacocinética de Fito-Compuestos Locales",
            date: "2026-06-14",
            learning: "Auditoría de compuestos biológicamente activos autónomos. Desarrollo de bases de datos locales indexadas por OpenAlex para consulta offline en tratamientos de neuro-sintonización y regulación del sueño.",
            possibilities: "Conectar base de datos molecular local con el motor de inferencia clínica de Node Beta.",
            related_ids: [1781700000, 1781700003]
        },
        {
            id: 1781700003,
            category: "privacy-wearables",
            title: "Blindaje Electromagnético Pasivo: Diseño de Textiles Reactivos a Frecuencias RF",
            date: "2026-06-16",
            learning: "Investigación sobre geometrías de hilos conductores de cobre y plata entrelazados en prendas cotidianas para atenuar señales de radiofrecuencia (RF) de alta frecuencia y asegurar el exocórtex físico.",
            possibilities: "Producir maquetas de corte láser en suite Penpot-MCP e integrar métricas de atenuación en la interfaz local.",
            related_ids: [1781700001, 1781700002]
        }
    ];

    // Load catalog data
    async function loadCatalog() {
        try {
            const response = await fetch('data/catalog.json');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    articles = data;
                } else {
                    articles = SEED_DATA;
                }
            } else {
                console.warn('Catalog catalog.json not found, using static seeds.');
                articles = SEED_DATA;
            }
        } catch (error) {
            console.error('Error fetching catalog, using seeds.', error);
            articles = SEED_DATA;
        }
        
        statsCount.textContent = articles.length;
        renderArticles();
    }

    // Category mapping helper
    function getCategoryClass(category) {
        return category.toLowerCase().replace(/\s+/g, '-');
    }

    // Render articles grid
    function renderArticles() {
        grid.innerHTML = '';
        
        const filtered = articles.filter(art => {
            const matchesCategory = currentCategory === 'all' || art.category === currentCategory;
            const matchesSearch = searchQuery === '' || 
                art.title.toLowerCase().includes(searchQuery) ||
                art.learning.toLowerCase().includes(searchQuery) ||
                (art.possibilities && art.possibilities.toLowerCase().includes(searchQuery));
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>No se encontraron registros en este cuadrante.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(art => {
            const card = document.createElement('article');
            card.className = `article-card ${getCategoryClass(art.category)}`;
            
            // Format Timestamp to Date string if ID is unix timestamp
            let dateStr = art.date;
            if (!dateStr && art.id) {
                const dateObj = new Date(art.id * 1000);
                dateStr = dateObj.toISOString().split('T')[0];
            }

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-badge">${art.category}</span>
                    <span class="card-date">${dateStr || 'N/A'}</span>
                </div>
                <h3>${art.title}</h3>
                <div class="card-body">
                    ${art.learning}
                </div>
                <div class="card-footer">
                    <button class="read-btn" data-id="${art.id}">
                        Estudiar Archivo 
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <span class="card-id">#${art.id}</span>
                </div>
            `;
            
            grid.appendChild(card);
        });

        // Add event listeners to cards buttons
        document.querySelectorAll('.read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                openArticle(id);
            });
        });
    }

    // Modal management
    function openArticle(id) {
        const article = articles.find(art => art.id === id);
        if (!article) return;

        modalCategory.textContent = article.category;
        // Adjust badge styles based on category
        modalCategory.className = 'modal-badge';
        modalCategory.classList.add(getCategoryClass(article.category));
        
        modalTitle.textContent = article.title;
        
        let dateStr = article.date;
        if (!dateStr && article.id) {
            const dateObj = new Date(article.id * 1000);
            dateStr = dateObj.toISOString().split('T')[0];
        }
        modalDate.textContent = dateStr || 'N/A';
        modalId.textContent = `ID: ${article.id}`;
        
        modalLearning.textContent = article.learning;
        modalPossibilities.textContent = article.possibilities || 'Sin integraciones adicionales registradas.';
        
        // Render related articles
        renderRelated(article);

        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function renderRelated(article) {
        relatedGrid.innerHTML = '';
        const relatedIds = article.related_ids || [];
        
        // If no precomputed related items, find other items in the same category
        let relatedItems = [];
        if (relatedIds.length > 0) {
            relatedItems = articles.filter(art => relatedIds.includes(art.id));
        }
        
        if (relatedItems.length === 0) {
            relatedItems = articles
                .filter(art => art.category === article.category && art.id !== article.id)
                .slice(0, 2);
        }

        if (relatedItems.length === 0) {
            // Pick random articles as generic recommendation
            relatedItems = articles
                .filter(art => art.id !== article.id)
                .slice(0, 2);
        }

        relatedItems.forEach(rel => {
            const div = document.createElement('div');
            div.className = 'related-card';
            div.innerHTML = `
                <h4>${rel.title}</h4>
                <span>${rel.category}</span>
            `;
            div.addEventListener('click', () => {
                // Instantly open the clicked related article
                openArticle(rel.id);
            });
            relatedGrid.appendChild(div);
        });
    }

    function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Filter operations
    filterTabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-category');
            renderArticles();
        }
    });

    // Search operations
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderArticles();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        renderArticles();
    });

    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    closeModalBtn.addEventListener('click', closeModal);

    // Escape key listener for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    // Run initialization
    loadCatalog();
});
