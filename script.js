const GAMES_PER_PAGE = 40;
let currentPage = 1;
let allGames = [];

async function fetchGames(searchTerm = '') {
    try {
        const loading = document.getElementById('gameContainer');
        loading.innerHTML = '<div class="loading-spinner">Oyunlar yükleniyor...</div>';

        const corsProxy = 'https://cors-anywhere.herokuapp.com/';
        let url = 'https://www.cheapshark.com/api/1.0/deals?pageSize=60&sortBy=Deal Rating';
        if (searchTerm) {
            url = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(searchTerm)}&limit=60`;
        }

        const response = await fetch(corsProxy + url, {
            headers: {
                'Origin': 'null',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const data = await response.json();
        
        allGames = (searchTerm ? data : data).map(item => ({
            name: searchTerm ? item.external : item.title,
            gameID: searchTerm ? item.gameID : item.gameID,
            thumb: searchTerm ? item.thumb : item.thumb,
            prices: {
                [getStoreName(searchTerm ? item.cheapestDealID.split('-')[1] : item.storeID)]: {
                    current: parseFloat(searchTerm ? item.cheapest : item.salePrice),
                    original: parseFloat(searchTerm ? item.cheapest : item.normalPrice),
                    discount: Math.round((1 - (searchTerm ? item.cheapest : item.salePrice) / (searchTerm ? item.cheapest : item.normalPrice)) * 100),
                    url: `https://www.cheapshark.com/redirect?dealID=${searchTerm ? item.cheapestDealID : item.dealID}`,
                    storeID: searchTerm ? item.cheapestDealID.split('-')[1] : item.storeID
                }
            }
        }));

        // Her oyun için diğer mağaza fiyatlarını al
        for (let game of allGames) {
            try {
                const priceResponse = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${game.gameID}`);
                const priceData = await priceResponse.json();
                
                if (priceData.deals) {
                    priceData.deals.forEach(deal => {
                        const storeName = getStoreName(deal.storeID);
                        if (storeName && !game.prices[storeName]) {
                            game.prices[storeName] = {
                                current: parseFloat(deal.price),
                                original: parseFloat(deal.retailPrice),
                                discount: Math.round((1 - (deal.price / deal.retailPrice)) * 100),
                                url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
                                storeID: deal.storeID
                            };
                        }
                    });
                }
            } catch (error) {
                console.error(`Fiyat bilgisi alınamadı: ${game.name}`, error);
            }
        }

        createGameCards(currentPage);
    } catch (error) {
        console.error('Oyun verileri alınırken hata oluştu:', error);
        const container = document.getElementById('gameContainer');
        container.innerHTML = `
            <div class="error">
                Oyunlar yüklenirken bir hata oluştu. 
                <button onclick="location.reload()">Tekrar Dene</button>
            </div>`;
    }
}

function getStoreName(storeID) {
    const stores = {
        '1': 'steam',
        '2': 'gamersgate',
        '3': 'greenmangaming',
        '7': 'gog',
        '8': 'origin',
        '11': 'humble',
        '25': 'epic'
    };
    return stores[storeID] || 'other';
}

function createGameCards(page) {
    const container = document.getElementById('gameContainer');
    container.innerHTML = '';
    
    const startIndex = (page - 1) * GAMES_PER_PAGE;
    const endIndex = startIndex + GAMES_PER_PAGE;
    const gamesForPage = allGames.slice(startIndex, endIndex);
    
    gamesForPage.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        let priceHTML = '';
        for (const [platform, price] of Object.entries(game.prices)) {
            if (price.current > 0) { // Sadece fiyatı olan oyunları göster
                priceHTML += `
                    <div class="platform-price">
                        <span class="platform-name">
                            <img src="icons/${platform}.png" alt="${platform}" class="platform-icon">
                            ${platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </span>
                        <div class="price-info" onclick="window.open('${price.url}', '_blank')">
                            <span class="original-price">$${price.original.toFixed(2)}</span>
                            <span class="current-price">$${price.current.toFixed(2)}</span>
                            ${price.discount > 0 ? `<span class="discount">-%${price.discount}</span>` : ''}
                        </div>
                    </div>
                `;
            }
        }
        
        card.innerHTML = `
            <img src="${game.thumb}" alt="${game.name}" class="game-image">
            <h2 class="game-title">${game.name}</h2>
            <div class="price-container">
                ${priceHTML}
            </div>
        `;
        
        container.appendChild(card);
    });

    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(allGames.length / GAMES_PER_PAGE);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Önceki';
        prevButton.onclick = () => {
            currentPage--;
            createGameCards(currentPage);
            window.scrollTo(0, 0);
        };
        pagination.appendChild(prevButton);
    }
    
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Sonraki';
        nextButton.onclick = () => {
            currentPage++;
            createGameCards(currentPage);
            window.scrollTo(0, 0);
        };
        pagination.appendChild(nextButton);
    }
}

document.getElementById('searchInput').addEventListener('input', debounce((e) => {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length > 2) {
        currentPage = 1;
        fetchGames(searchTerm);
    } else if (searchTerm.length === 0) {
        currentPage = 1;
        fetchGames();
    }
}, 300));

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.onload = () => fetchGames(); 