// api/search.js
// Yeh code BINA YOUTUBE_API_KEY ke bhi gaane search kar leta hai!
// Agar future mein aap YOUTUBE_API_KEY daalenge toh official API use karega, warna free fallback se chalega.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Sirf GET method allowed hai' });
  }

  const query = req.query.q;
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search query (q) zaroori hai' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  // 1. Agar API Key मौजूद hai toh Official YouTube Data API v3 use karein
  if (apiKey && apiKey.trim() !== '') {
    try {
      const ytApiUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      ytApiUrl.searchParams.set('part', 'snippet');
      ytApiUrl.searchParams.set('type', 'video');
      ytApiUrl.searchParams.set('videoEmbeddable', 'true');
      ytApiUrl.searchParams.set('maxResults', '12');
      ytApiUrl.searchParams.set('q', query.trim());
      ytApiUrl.searchParams.set('key', apiKey);

      const response = await fetch(ytApiUrl.toString());
      const data = await response.json();

      if (response.ok && data.items) {
        const results = data.items.map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail:
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url
        }));
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        return res.status(200).json({ items: results });
      }
    } catch (err) {
      console.warn('Official API failed, switching to keyless fallback:', err);
    }
  }

  // 2. KEYLESS MODE (Bina API Key ke seedha YouTube search results laana)
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}&sp=EgIQAQ%253D%253D`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = await response.text();

    // YouTube page ke initial JSON data ko extract karein
    const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
    if (!match || !match[1]) {
      return res.status(500).json({ error: 'Search results parse nahi ho paye. Dobara try karein.' });
    }

    const ytData = JSON.parse(match[1]);
    const contents =
      ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];

    const results = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId) {
          results.push({
            videoId: v.videoId,
            title: v.title?.runs?.[0]?.text || 'Unknown Title',
            channelTitle: v.ownerText?.runs?.[0]?.text || 'YouTube Channel',
            thumbnail:
              v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`
          });
        }
        if (results.length >= 12) break;
      }
      if (results.length >= 12) break;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ items: results });
  } catch (error) {
    console.error('Keyless Search Error:', error);
    return res.status(500).json({ error: 'Gaana search karne mein error aaya.' });
  }
}