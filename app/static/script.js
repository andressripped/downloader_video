document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('downloadForm');
    const input = document.getElementById('urlInput');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = input.value.trim();
        if (!url) return;

        // Reset UI
        error.classList.add('hidden');
        result.classList.add('hidden');
        loading.classList.remove('hidden');
        result.innerHTML = '';
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed', 'scale-[0.98]');
        submitBtn.querySelector('i').classList.replace('fa-bolt', 'fa-spinner');
        submitBtn.querySelector('i').classList.add('fa-spin');

        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Ocurrió un error al procesar el enlace.');
            }

            renderResult(data);
            
            // Mostrar resultados con animación
            result.classList.remove('hidden');
            result.classList.add('animate-fade-in');
            
        } catch (err) {
            errorMessage.textContent = err.message;
            error.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'scale-[0.98]');
            submitBtn.querySelector('i').classList.remove('fa-spin');
            submitBtn.querySelector('i').classList.replace('fa-spinner', 'fa-bolt');
        }
    });

    function renderResult(data) {
        let html = '';
        const filenameBase = (data.title || 'download').replace(/[^a-z0-9]/gi, '_').toLowerCase();

        // Tarjeta de Información (Thumbnail + Título)
        html += `
            <div class="flex items-center gap-4 p-4 bg-slate-950/40 rounded-[1.25rem] border border-slate-800/60 shadow-inner">
                <div class="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 shadow-md">
                    <img src="${data.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzFZTTE0MjMiLz48L3N2Zz4='}" 
                         class="w-full h-full object-cover" alt="Thumbnail" onerror="this.style.opacity='0.5'">
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-slate-200 font-medium text-sm sm:text-base line-clamp-2 leading-snug mb-1.5" title="${data.title || 'Contenido Descargable'}">
                        ${data.title || 'Contenido Descargable'}
                    </h3>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize tracking-wide">
                        <i class="fa-brands fa-${data.platform} mr-1.5"></i> ${data.platform} ${data.type || ''}
                    </span>
                </div>
            </div>
            <div class="space-y-3 mt-5">
        `;

        if (data.platform === 'tiktok') {
            if (data.original_url) {
                // Primer Botón: H.265 (Comprimido / Azul Llamativo)
                const hdH265Url = `/api/download/tiktok?url=${encodeURIComponent(data.original_url)}&format_type=h265&filename=${filenameBase}_h265.mp4`;
                html += `
                    <a href="${hdH265Url}" target="_blank" class="w-full py-4 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                        <i class="fa-solid fa-cloud-arrow-down"></i> Descargar HD (Comprimido H.265)
                    </a>
                `;

                // Segundo Botón: H.264 (Pesado / Outline Sutil)
                const hdH264Url = `/api/download/tiktok?url=${encodeURIComponent(data.original_url)}&format_type=h264&filename=${filenameBase}_h264.mp4`;
                html += `
                    <a href="${hdH264Url}" target="_blank" class="w-full py-4 px-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 active:scale-[0.98] text-slate-300 hover:text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all">
                        <i class="fa-solid fa-film"></i> Descargar HD (Video Pesado H.264)
                    </a>
                `;
            } else {
                if (data.hd_url) {
                    const url = `/api/download/stream?url=${encodeURIComponent(data.hd_url)}&filename=${filenameBase}_hd.mp4`;
                    html += `
                        <a href="${url}" target="_blank" class="w-full py-4 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                            <i class="fa-solid fa-download"></i> Descargar HD
                        </a>
                    `;
                }
            }
        } else if (data.platform === 'instagram') {
            if (data.type === 'carousel') {
                const urls = data.urls.join(',');
                const zipUrl = `/api/download/zip?urls=${encodeURIComponent(urls)}&title=${filenameBase}`;
                html += `
                    <a href="${zipUrl}" target="_blank" class="w-full py-4 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-[0.98] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                        <i class="fa-solid fa-file-zipper"></i> Descargar Carrusel Completo (.zip)
                    </a>
                `;
            } else if (data.type === 'video' || data.type === 'photo' || data.type === 'profile') {
                const ext = data.type === 'video' ? 'mp4' : 'jpg';
                const url = `/api/download/stream?url=${encodeURIComponent(data.hd_url)}&filename=${filenameBase}.${ext}`;
                const gradient = data.platform === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]';
                
                html += `
                    <a href="${url}" target="_blank" class="w-full py-4 px-4 ${gradient} active:scale-[0.98] text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_currentColor]">
                        <i class="fa-solid fa-download"></i> Descargar Máxima Calidad
                    </a>
                `;
            }
        }

        html += `</div>`;
        result.innerHTML = html;
    }
});
