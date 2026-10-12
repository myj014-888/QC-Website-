// Live Google reviews for the home page, via the Google Places API (New).
//
// Needs one environment variable in Vercel:
//   GOOGLE_PLACES_API_KEY  - an API key restricted to "Places API (New)".
// Optional:
//   GOOGLE_PLACE_ID        - overrides the place below.
//
// Google returns at most the 5 "most relevant" reviews, so the page shows those.
// The response is cached at Vercel's edge for a day, so Google is only called
// about once a day however many people visit. If the key is missing or Google
// errors, this returns a non-200 and the page keeps its built-in reviews.

const PLACE_ID = process.env.GOOGLE_PLACE_ID || 'ChIJWXTYp4LU3AYRuIKpb1uUd0g';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Reviews feed is not configured' });
    return;
  }

  try {
    const r = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(PLACE_ID) + '?languageCode=en', {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews'
      }
    });
    if (!r.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(502).json({ error: 'Google responded with ' + r.status });
      return;
    }
    const d = await r.json();

    const reviews = (d.reviews || [])
      .map((v) => ({
        author: (v.authorAttribution && v.authorAttribution.displayName) || 'Google user',
        url: (v.authorAttribution && v.authorAttribution.uri) || '',
        rating: v.rating || 0,
        text: ((v.originalText && v.originalText.text) || (v.text && v.text.text) || '').trim(),
        time: v.publishTime || ''
      }))
      .filter((v) => v.text && v.rating >= 1)
      .sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      rating: d.rating || null,
      count: d.userRatingCount || reviews.length,
      reviews
    });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'Could not reach Google' });
  }
};
