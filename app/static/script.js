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
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

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
            
            // Render icons
            if (window.lucide) {
                lucide.createIcons();
            }
            
            result.classList.remove('hidden');
            result.classList.add('animate-fade-in');
            
        } catch (err) {
            errorMessage.textContent = err.message;
            error.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });

    window.copyToClipboard = function(text, btnElement) {
        navigator.clipboard.writeText(text).then(() => {
            const icon = btnElement.querySelector('i');
            const originalIcon = icon.getAttribute('data-lucide');
            icon.setAttribute('data-lucide', 'check');
            lucide.createIcons();
            
            setTimeout(() => {
                icon.setAttribute('data-lucide', originalIcon);
                lucide.createIcons();
            }, 2000);
        });
    };

    function renderResult(data) {
        let html = '';
        const filenameBase = (data.title || 'download').replace(/[^a-z0-9]/gi, '_').toLowerCase();

        html += `
            <div class="flex items-start gap-4 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
                <div class="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800">
                    <img src="${data.thumbnail || ''}" 
                         class="w-full h-full object-cover" alt="Thumbnail" onerror="this.style.opacity='0'">
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-zinc-200 font-medium text-sm line-clamp-2 leading-snug mb-1" title="${data.title || 'Contenido'}">
                        ${data.title || 'Contenido Extraído'}
                    </h3>
                    <span class="inline-flex items-center text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                        ${data.platform} ${data.type || ''}
                    </span>
                </div>
            </div>
        `;

        if (data.description) {
            const safeDesc = data.description.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#96;');
            html += `
                <div class="relative group p-3 bg-zinc-950/30 border border-zinc-800/80 rounded-lg">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Descripción</span>
                        <button onclick="copyToClipboard(\`${safeDesc}\`, this)" class="text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-900 border border-zinc-800 rounded px-2 py-1 flex items-center gap-1.5" title="Copiar descripción">
                            <i data-lucide="copy" class="w-3 h-3"></i>
                            <span class="text-[10px] font-medium">Copiar</span>
                        </button>
                    </div>
                    <p class="text-zinc-400 text-xs leading-relaxed line-clamp-4">${data.description}</p>
                </div>
            `;
        }

        html += `<div class="space-y-2.5 mt-4">`;

        if (data.platform === 'tiktok') {
            if (data.original_url) {
                const hdH265Url = `/api/download/tiktok?url=${encodeURIComponent(data.original_url)}&format_type=h265&filename=${filenameBase}_h265.mp4`;
                html += `
                    <a href="${hdH265Url}" target="_blank" class="w-full py-3 px-4 bg-white hover:bg-zinc-200 active:scale-[0.99] text-black font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all">
                        <i data-lucide="download" class="w-4 h-4"></i> Descargar HD (H.265 Comprimido)
                    </a>
                `;

                const hdH264Url = `/api/download/tiktok?url=${encodeURIComponent(data.original_url)}&format_type=h264&filename=${filenameBase}_h264.mp4`;
                html += `
                    <a href="${hdH264Url}" target="_blank" class="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 active:scale-[0.99] text-zinc-300 font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all">
                        <i data-lucide="hard-drive" class="w-4 h-4 text-zinc-500"></i> Descargar HD (H.264 Pesado)
                    </a>
                `;
            } else {
                if (data.hd_url) {
                    const url = `/api/download/stream?url=${encodeURIComponent(data.hd_url)}&filename=${filenameBase}_hd.mp4`;
                    html += `
                        <a href="${url}" target="_blank" class="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-black font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all">
                            <i data-lucide="download" class="w-4 h-4"></i> Descargar HD
                        </a>
                    `;
                }
            }
        } else if (data.platform === 'instagram') {
            if (data.type === 'carousel') {
                const urls = data.urls.join(',');
                const zipUrl = `/api/download/zip?urls=${encodeURIComponent(urls)}&title=${filenameBase}`;
                html += `
                    <a href="${zipUrl}" target="_blank" class="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-black font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all">
                        <i data-lucide="archive" class="w-4 h-4"></i> Descargar Carrusel (.zip)
                    </a>
                `;
            } else if (data.type === 'video' || data.type === 'photo' || data.type === 'profile') {
                const ext = data.type === 'video' ? 'mp4' : 'jpg';
                const url = `/api/download/stream?url=${encodeURIComponent(data.hd_url)}&filename=${filenameBase}.${ext}`;
                
                html += `
                    <a href="${url}" target="_blank" class="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-black font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all">
                        <i data-lucide="download" class="w-4 h-4"></i> Descargar Original
                    </a>
                `;
            }
        }

        html += `</div>`;
        result.innerHTML = html;
    }
});
