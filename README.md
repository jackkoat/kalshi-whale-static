# KalshiWhale - Static Version

🐋 **Real-time Crypto Whale Tracker for Kalshi Prediction Markets**

A static website version of KalshiWhale that monitors cryptocurrency prediction markets on Kalshi. Features real-time data fetching, whale detection alerts, and professional trading interface.

## ✨ Features

- **Real-time Data**: Fetches live data from Kalshi API
- **Whale Detection**: Monitor large positions and volume spikes  
- **Interactive Charts**: Volume and probability visualization with Chart.js
- **Sentiment Analysis**: Bullish/Bearish indicators based on market probabilities
- **Mobile Responsive**: Optimized for desktop and mobile devices
- **Auto-refresh**: Updates every 2 minutes automatically

## 🚀 Quick Deploy to Vercel

### Method 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel --prod
```

### Method 2: GitHub + Vercel
1. Push code to GitHub repository
2. Connect repository to Vercel dashboard
3. Deploy automatically on push

### Method 3: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Upload the `kalshi_whale_static` folder
4. Deploy

## 📊 Data Sources

- **API**: Kalshi Trade API (https://api.elections.kalshi.com/trade-api/v2)
- **Markets**: Bitcoin (KXBTC) & Ethereum (KXETH) prediction markets
- **Updates**: Client-side polling every 2 minutes

## 🛠️ Local Development

### Using Python (Simple)
```bash
# Navigate to project directory
cd kalshi_whale_static

# Start local server
python -m http.server 8000

# Open browser: http://localhost:8000
```

### Using Node.js
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or use npx serve
npx serve -s . -p 8000
```

## 📁 Project Structure

```
kalshi_whale_static/
├── index.html          # Main application (single page)
├── package.json        # npm configuration
├── vercel.json         # Vercel deployment config
├── .gitignore          # Git ignore rules
└── README.md          # This file
```

## 🔧 Configuration

### Update Interval
Modify the `UPDATE_INTERVAL` in `index.html`:
```javascript
const UPDATE_INTERVAL = 120000; // 2 minutes (120,000ms)
```

### API Endpoints
The app fetches data from:
- `https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXBTC&limit=50`
- `https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXETH&limit=50`

### Fallback Strategy
If crypto markets not found, falls back to:
- `https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=100`

## 🎨 Customization

### Colors & Themes
Edit CSS variables in `index.html`:
```css
:root {
  --primary-color: #00d4ff;
  --background: #0a0a0a;
  --card-background: #1a1a1a;
}
```

### Chart Types
Modify Chart.js configuration for different visualizations:
```javascript
const chartType = 'bar'; // 'line', 'doughnut', 'pie', etc.
```

## 📱 Mobile Support

The interface is fully responsive with:
- Grid layout adaptation
- Touch-friendly controls
- Optimized chart sizing
- Mobile navigation

## 🚨 Whale Detection

Whale alerts are generated based on:
- **High Volume**: Markets with volume > 1000
- **Sentiment**: Bullish (>60%) or Bearish (<40%) probabilities
- **Category**: Bitcoin and Ethereum markets prioritized

## 📈 Analytics Included

- ✅ Probability calculations (price × 100%)
- ✅ Volume rankings and analysis
- ✅ Sentiment classification
- ✅ Market activity scoring
- ✅ Real-time data updates
- ✅ Interactive visualizations

## 🔍 Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 🆘 Troubleshooting

### CORS Issues
If you see CORS errors, the API might be blocking cross-origin requests. This is normal and handled by the fallback strategy.

### No Data Showing
1. Check browser console for errors
2. Verify internet connection
3. Try manual refresh (🔄 button)
4. API might be temporarily down

### Charts Not Loading
1. Ensure Chart.js CDN is accessible
2. Check browser console for JavaScript errors
3. Verify data structure from API

## 📄 License

MIT License - feel free to use and modify for your projects.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

**Ready to track crypto whales! 🐋📈**

Deployed with ❤️ using Vercel