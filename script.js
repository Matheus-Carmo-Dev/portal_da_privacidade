document.addEventListener('DOMContentLoaded', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    const articleModal = document.getElementById('article-modal');
    const articleModalContent = document.getElementById('article-modal-content');

    // --- LÓGICA DO GLOBO 3D ---
    let scene, camera, renderer, globe, group, targetRotation = { x: 0, y: 0 }, isDragging = false, previousMousePosition = { x: 0, y: 0 };
    let highlightMesh = null;

    const countryData = {
        brazil: {
            lat: -14.2350, lon: -51.9253,
            title: "Brasil - LGPD",
            description: "A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) regula o tratamento de dados pessoais no Brasil, inspirada na GDPR europeia.",
            points: ["Direitos do titular", "Bases legais para tratamento", "Criação da ANPD"]
        },
        europe: {
            lat: 54.5260, lon: 15.2551,
            title: "Europa - GDPR",
            description: "O Regulamento Geral sobre a Proteção de Dados é a referência global, com regras rígidas sobre consentimento, transferência de dados e multas elevadas.",
            points: ["Consentimento explícito", "Direito ao esquecimento", "Notificação de violação em 72h"]
        },
        usa: {
            lat: 36.7783, lon: -119.4179,
            title: "EUA - CCPA/CPRA",
            description: "A Lei de Privacidade do Consumidor da Califórnia (CCPA), expandida pela CPRA, concede aos consumidores californianos direitos sobre os seus dados.",
            points: ["Direito de saber", "Direito de apagar", "Direito de optar por não vender dados"]
        },
        china: {
            lat: 35.8617, lon: 104.1954,
            title: "China - PIPL",
            description: "A Lei de Proteção de Informações Pessoais (PIPL) é uma das mais restritivas do mundo, com forte controlo sobre a transferência de dados para fora da China.",
            points: ["Consentimento separado para dados sensíveis", "Requisitos rigorosos para transferência internacional", "Grande poder para a autoridade reguladora"]
        }
    };

    function initGlobe() {
        const container = document.getElementById('globe-container');
        if (!container || container.querySelector('canvas')) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 2.5;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0xffffff, 0);
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xCCCCCC, 0.5);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        camera.add(pointLight);
        scene.add(camera);

        group = new THREE.Group();
        const globeGeometry = new THREE.SphereGeometry(1.5, 64, 64);
        
        // Globo base (branco)
        const globeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        globe = new THREE.Mesh(globeGeometry, globeMaterial);
        group.add(globe);

        // Camada com as linhas dos países
        const textureLoader = new THREE.TextureLoader();
        // URL da imagem de referência com fundo transparente
        const outlineTexture = textureLoader.load('https://i.imgur.com/pBfU6f4.png'); 
        const outlineMaterial = new THREE.MeshBasicMaterial({
            map: outlineTexture,
            transparent: true,
            opacity: 1,
            color: 0x0A4F8A 
        });
        const outlineSphere = new THREE.Mesh(globeGeometry, outlineMaterial);
        outlineSphere.scale.set(1.001, 1.001, 1.001);
        group.add(outlineSphere);
        
        scene.add(group);
        
        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('resize', onWindowResize);

        animate();
    }
    
    function onWindowResize() {
        const container = document.getElementById('globe-container');
        if (!container || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function animate() {
        if (!renderer) return;
        requestAnimationFrame(animate);
        group.rotation.x += (targetRotation.x - group.rotation.x) * 0.1;
        group.rotation.y += (targetRotation.y - group.rotation.y) * 0.1;
        if (!isDragging) {
            targetRotation.y += 0.001;
        }
        renderer.render(scene, camera);
    }

    function onMouseDown(event) { isDragging = true; previousMousePosition = { x: event.clientX, y: event.clientY }; }
    function onMouseMove(event) {
        if (!isDragging) return;
        const deltaMove = { x: event.clientX - previousMousePosition.x, y: event.clientY - previousMousePosition.y };
        targetRotation.y += deltaMove.x * 0.005;
        targetRotation.x += deltaMove.y * 0.005;
        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
    function onMouseUp() { isDragging = false; }

    function pointToCountry(country) {
        const data = countryData[country];
        const latRad = data.lat * (Math.PI / 180);
        const lonRad = -data.lon * (Math.PI / 180);
        targetRotation.x = latRad;
        targetRotation.y = lonRad - Math.PI / 2;

        if (highlightMesh) {
            group.remove(highlightMesh);
        }

        const highlightGeometry = new THREE.CircleGeometry(0.2, 32);
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x2ECC71, transparent: true, opacity: 0.6 });
        highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);

        const position = new THREE.Vector3();
        position.setFromSphericalCoords(1.51, Math.PI / 2 - latRad, -lonRad);
        highlightMesh.position.copy(position);
        highlightMesh.lookAt(new THREE.Vector3(0,0,0).multiplyScalar(2));
        
        group.add(highlightMesh);
        
        const infoPanel = document.getElementById('country-info');
        infoPanel.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800">${data.title}</h3>
            <p class="text-gray-600 mt-2 text-sm">${data.description}</p>
            <ul class="mt-4 space-y-2">
                ${data.points.map(p => `<li class="flex items-start"><i data-lucide="check-circle-2" class="w-5 h-5 text-brand-green mr-2 mt-0.5"></i><span class="text-sm">${p}</span></li>`).join('')}
            </ul>`;
        lucide.createIcons();
    }

    // --- LÓGICA DE NAVEGAÇÃO E MODAL ---
    const showPage = (pageId) => {
        document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            if (pageId === 'pelo-mundo') {
                setTimeout(initGlobe, 50);
            }
        } else {
            document.getElementById('page-home').classList.remove('hidden');
        }
        window.scrollTo(0, 0);
    };

    const openArticle = (element) => {
        const { title, category, img, author, date } = element.dataset;
        const articleHTML = `
            <div class="relative">
                <img src="${img.replace(/(\d+)x(\d+)/, '1200x600')}" alt="${title}" class="w-full h-64 object-cover rounded-t-xl">
                <button id="close-modal-button" class="absolute top-4 right-4 bg-white/70 p-2 rounded-full text-gray-800 hover:bg-white transition-all-300"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div class="p-8">
                <span class="text-brand-blue-dark font-semibold text-sm">${category}</span>
                <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2 mb-4 leading-tight">${title}</h1>
                <div class="flex items-center space-x-4 text-sm mb-6">
                    <div><p class="font-semibold text-gray-800">Por ${author}</p><p class="text-gray-500">Publicado em ${date}</p></div>
                </div>
                <article class="prose prose-lg max-w-none text-gray-700">
                    <p>Este é um texto de exemplo para o artigo. O conteúdo completo seria carregado aqui. A Autoridade Nacional de Proteção de Dados (ANPD) divulgou nesta semana uma resolução aguardada pelo mercado, estabelecendo regras claras para o tratamento de dados pessoais de crianças e adolescentes.</p>
                    <p>De acordo com o texto, o tratamento de dados de crianças deverá ser realizado com o consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal.</p>
                </article>
            </div>`;
        articleModalContent.innerHTML = articleHTML;
        lucide.createIcons();
        articleModal.classList.remove('hidden');
        setTimeout(() => { articleModal.classList.remove('opacity-0'); articleModalContent.classList.remove('scale-95'); }, 10);
        document.getElementById('close-modal-button').addEventListener('click', closeArticle);
    };

    const closeArticle = () => {
        articleModal.classList.add('opacity-0');
        articleModalContent.classList.add('scale-95');
        setTimeout(() => { articleModal.classList.add('hidden'); articleModalContent.innerHTML = ''; }, 300);
    };

    const addArticleListeners = () => document.querySelectorAll('.open-article').forEach(element => element.addEventListener('click', () => openArticle(element)));
    addArticleListeners();

    const handleNavigation = () => showPage(window.location.hash.substring(1) || 'home');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = e.currentTarget.dataset.page;
        });
    });

    document.getElementById('mobile-menu-button').addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    window.addEventListener('hashchange', handleNavigation);

    document.body.addEventListener('click', function(event) {
        if (event.target.closest('#country-list button')) {
            const country = event.target.closest('button').dataset.country;
            pointToCountry(country);
        }
    });

    handleNavigation();
    lucide.createIcons();
});
