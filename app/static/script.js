document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const extractBtn = document.getElementById('extractBtn');
    const statusArea = document.getElementById('statusArea');
    const errorArea = document.getElementById('errorArea');
    const resultArea = document.getElementById('resultArea');

    // Smart detection trigger (opcional: autodisparar al detectar URL válida)
    urlInput.addEventListener('input', () => {
        const val = urlInput.value.trim();
        // Podríamos dispararlo automático, pero mejor esperar al botón para evitar spam de request
    });

    extractBtn.addEventListener('click', handleExtract);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleExtract();
    });

    async function handleExtract() {
        const url = urlInput.value.trim();
        if (!url) return;

        // Reset UI
        errorArea.classList.add('hidden');
        resultArea.classList.add('hidden');
        statusArea.classList.remove('hidden');
        extractBtn.disabled = true;

        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Error al procesar el enlace.');
            }

            renderResult(data);
        } catch (error) {
            errorArea.textContent = error.message;
            errorArea.classList.remove('hidden');
        } finally {
            statusArea.classList.add('hidden');
            extractBtn.disabled = false;
        }
    }

    function renderResult(data) {
        let html = `
            <div class="result-card">
                <div class="result-header">
                    <img src="${data.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzJjMmMyZSIvPjwvc3ZnPg=='}" class="thumbnail" alt="Thumbnail" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzJjMmMyZSIvPjwvc3ZnPg=='">
                    <div class="info">
                        <h3>${data.title || 'Contenido Descargable'}</h3>
                        <span class="badge">${data.platform} ${data.type || ''}</span>
                    </div>
                </div>
                <div class="actions">
        `;

        const filenameBase = (data.title || 'download').replace(/[^a-z0-9]/gi, '_').toLowerCase();

        if (data.platform === 'tiktok') {
            if (data.original_url) {
                const hdH264Url = `/api/download/tiktok?url=${encodeURIComponent(data.original_url)}&format_type=h264&filename=${filenameBase}_h264.mp4`;
                html += `<a href="${hdH264Url}" class="btn-download primary" target="_blank">⬇️ Descargar HD (Video Pesado H.264)</a>`;

                const hdH265Url = `/api/download/tiktok?url=${encodeURIComponent(data.original_url)}&format_type=h265&filename=${filenameBase}_h265.mp4`;
                html += `<a href="${hdH265Url}" class="btn-download" target="_blank">⬇️ Descargar HD (Comprimido H.265)</a>`;
            } else {
                if (data.hd_url) {
                    const url = `/api/download/stream?url=${encodeURIComponent(data.hd_url)}&filename=${filenameBase}_hd.mp4`;
                    html += `<a href="${url}" class="btn-download primary" target="_blank">⬇️ Descargar HD (Sin Marca de Agua)</a>`;
                }
            }
        } else if (data.platform === 'instagram') {
            if (data.type === 'carousel') {
                const urls = data.urls.join(',');
                const zipUrl = `/api/download/zip?urls=${encodeURIComponent(urls)}&title=${filenameBase}`;
                html += `<a href="${zipUrl}" class="btn-download primary" target="_blank">⬇️ Descargar Carrusel Completo (.zip)</a>`;

            } else if (data.type === 'video' || data.type === 'photo' || data.type === 'profile') {
                const ext = data.type === 'video' ? 'mp4' : 'jpg';
                const url = `/api/download/stream?url=${encodeURIComponent(data.hd_url)}&filename=${filenameBase}.${ext}`;
                html += `<a href="${url}" class="btn-download primary" target="_blank">⬇️ Descargar Máxima Calidad</a>`;
            }
        }

        html += `
                </div>
            </div>
        `;

        resultArea.innerHTML = html;
        resultArea.classList.remove('hidden');
    }
});
