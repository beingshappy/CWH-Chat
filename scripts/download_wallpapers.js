import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Artifact directory (Brain)
const brainDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\7fae7613-9a38-4006-b2fa-88492e58a264';
const publicDir = path.join(__dirname, '..', 'public', 'wallpapers');

const ASSETS = [
    // Noir (Generated)
    { name: 'onyx.png', source: 'onyx_luxury_wallpaper_1773567709067.png' },
    { name: 'obsidian.png', source: 'obsidian_luxury_wallpaper_1773567725033.png' },
    { name: 'midnight.png', source: 'midnight_luxury_wallpaper_1773567746619.png' },
    { name: 'carbon.png', source: 'carbon_luxury_wallpaper_1773567766388.png' },
    
    // Aurora (Generated)
    { name: 'sapphire.png', source: 'sapphire_luxury_wallpaper_1773567788818.png' },
    { name: 'emerald.png', source: 'emerald_luxury_wallpaper_1773567804289.png' },
    { name: 'ruby.png', source: 'ruby_luxury_wallpaper_1773567820891.png' },
    { name: 'ethereal.png', source: 'ethereal_luxury_wallpaper_1773567840729.png' },
    
    // Nature (Generated)
    { name: 'mist.png', source: 'mist_luxury_wallpaper_1773567856887.png' },
    { name: 'forest.png', source: 'forest_luxury_wallpaper_1773567871470.png' },
    { name: 'ocean.png', source: 'ocean_luxury_wallpaper_1773567886841.png' },
    { name: 'canyon.png', source: 'canyon_luxury_wallpaper_1773567903939.png' },
    
    // Abstract (Generated)
    { name: 'gold.png', source: 'gold_luxury_wallpaper_1773567927084.png' },
    { name: 'cyber.png', source: 'cyber_luxury_wallpaper_1773567942713.png' },
    { name: 'silk.png', source: 'silk_luxury_wallpaper_1773567958297.png' },
    { name: 'cosmic.png', source: 'cosmic_luxury_wallpaper_1773567976544.png' },
    
    // Minimal (Generated + Unsplash fallback)
    { name: 'smoke.png', source: 'smoke_luxury_wallpaper_1773567992027.png' },
    { name: 'shade.jpg', unsplashId: '1507525428034-b723cf961d3e' },
    { name: 'paper.jpg', unsplashId: '1517841905240-472988babdf9' },
    { name: 'airy.jpg', unsplashId: '1470770841072-f978cf4d019e' }
];

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

async function finalizeGallery() {
    console.log('🚀 Deploying "The Elite Gallery" (20 Bespoke Assets)...');

    for (const asset of ASSETS) {
        const destPath = path.join(publicDir, asset.name);
        
        if (asset.source) {
            // Local copy from brain
            const srcPath = path.join(brainDir, asset.source);
            try {
                fs.copyFileSync(srcPath, destPath);
                console.log(`✅ ${asset.name} [DEPLOYED]`);
            } catch (err) {
                console.error(`❌ ${asset.name} [COPY FAILED]: ${err.message}`);
            }
        } else if (asset.unsplashId) {
            // Unsplash fetch
            const url = `https://images.unsplash.com/photo-${asset.unsplashId}?auto=format&fit=crop&q=80&w=1200`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                fs.writeFileSync(destPath, buffer);
                console.log(`✅ ${asset.name} [SYNCED]`);
            } catch (err) {
                console.error(`❌ ${asset.name} [SYNC FAILED]: ${err.message}`);
            }
        }
    }
    console.log('✨ Gallery expansion complete.');
}

finalizeGallery();
