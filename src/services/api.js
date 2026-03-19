// Frontend is now served by Express, so always use relative path
const API_BASE_URL = '/api';

// Helper to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Central handler: on 401/403 clear token + redirect to login
const handleAuthError = (status) => {
    if (status === 401 || status === 403) {
        console.warn('[API] Token expired or invalid — redirecting to login');
        localStorage.removeItem('token');
        window.location.href = '/';
    }
};

export const fetchCftcData = async (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.market) queryParams.append('market', params.market);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.exchange) queryParams.append('exchange', params.exchange);

    try {
        const response = await fetch(`${API_BASE_URL}/cftc-data?${queryParams.toString()}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            handleAuthError(response.status);
            throw new Error(`API error: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Failed to fetch CFTC data:', error);
        throw error;
    }
};

export const fetchCocoaBagsData = async (seriesLabel, start = null, end = null, table = null) => {
    try {
        const query = new URLSearchParams();
        if (seriesLabel) query.append('series', seriesLabel);
        if (start) query.append('from', start);
        if (end) query.append('to', end);
        if (table) query.append('table', table);

        const res = await fetch(`${API_BASE_URL}/cocoa-bags?${query}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            handleAuthError(res.status);
            throw new Error(`API error: ${res.statusText}`);
        }
        const data = await res.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch Cocoa Bags data:', error);
        throw error;
    }
};

export const fetchLondonOriginData = async (ageCategory = 'TOTAL Valid', metric = 'total_mt') => {
    try {
        const query = new URLSearchParams();
        query.append('ageCategory', ageCategory);
        query.append('metric', metric);

        const res = await fetch(`${API_BASE_URL}/cocoa-london-origin?${query}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            handleAuthError(res.status);
            throw new Error(`API error: ${res.statusText}`);
        }
        const data = await res.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch London Origin data:', error);
        throw error;
    }
};

export const fetchIvoryArrivalsData = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/cocoa-arrivals/ivory`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            handleAuthError(res.status);
            throw new Error(`API error: ${res.statusText}`);
        }
        const data = await res.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch Ivory Arrivals data:', error);
        throw error;
    }
};

export const fetchCocoaRatiosData = async (category) => {
    try {
        const res = await fetch(`${API_BASE_URL}/cocoa-product-ratios?category=${category}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            handleAuthError(res.status);
            throw new Error(`API error: ${res.statusText}`);
        }
        const data = await res.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch Cocoa Ratios data:', error);
        throw error;
    }
};

export const fetchOHLC = async (instruments, interval = '1D', count = 50, end = null, start = null) => {
    try {
        // Convert single instrument to array if needed
        const instrumentList = Array.isArray(instruments) ? instruments : [instruments];
        const instrumentsParam = instrumentList.join(',');

        const query = new URLSearchParams({
            instruments: instrumentsParam,
            interval,
            count: count.toString()
        });

        if (end) query.append('end', end);
        if (start) query.append('start', start);

        const res = await fetch(`${API_BASE_URL}/v2/ohlc?${query}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error(`API error: ${res.statusText}`);
        const json = await res.json();

        console.log('[API] v2/ohlc response:', json);

        // New v2 API returns data directly
        if (json && typeof json === 'object') {
            // If single instrument requested, return that instrument's data
            if (instrumentList.length === 1) {
                const instrument = instrumentList[0];
                const instrumentData = json[instrument];

                if (instrumentData && Array.isArray(instrumentData)) {
                    return instrumentData.map(item => ({
                        time: item.time || item.timestamp,
                        open: item.open,
                        high: item.high,
                        low: item.low,
                        close: item.close,
                        volume: item.volume
                    }));
                }
            }

            // If multiple instruments, return the full object
            return json;
        }

        return [];
    } catch (err) {
        console.error('Failed to fetch OHLC from v2 API:', err);
        throw err;
    }
};

export const fetchProducts = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: getAuthHeaders() // Add Auth
        });
        if (!response.ok) {
            handleAuthError(response.status);
            throw new Error('Failed to fetch products');
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
};

export const fetchColumns = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/columns`, {
            headers: getAuthHeaders() // Add Auth
        });
        if (!response.ok) {
            handleAuthError(response.status);
            throw new Error('Failed to fetch columns');
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Error fetching columns:', error);
        return [];
    }
};

export const fetchOIScreener = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/oi-screener`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            handleAuthError(res.status);
            throw new Error(`API error: ${res.statusText}`);
        }
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch OI screener data:', error);
        throw error;
    }
};
