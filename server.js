const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(compression());

// Ensure the 'capture' folder exists
const captureFolderPath = path.join(__dirname, 'capture');
fs.mkdir(captureFolderPath, { recursive: true }).catch(console.error);

let latestImage = '';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/capture', express.static(captureFolderPath));

// Upload route
app.post('/upload', async (req, res) => {
    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/png;base64,/, '');
        const fileName = `captured_image_${Date.now()}.png`;
        const filePath = path.join(captureFolderPath, fileName);

        await fs.writeFile(filePath, base64Data, 'base64');
        latestImage = `/capture/${fileName}`;
        res.json({ imagePath: latestImage });
    } catch (error) {
        console.error('Error saving image:', error);
        res.status(500).send('Error saving image');
    }
});

// Get latest image
app.get('/latest-image', (req, res) => {
    if (latestImage) {
        const imagePath = path.join(__dirname, latestImage);
        res.sendFile(imagePath);
    } else {
        res.status(404).send('No image found');
    }
});

// Get latest images
app.get('/latest-images', async (req, res) => {
    try {
        const files = await fs.readdir(captureFolderPath);
        const imageFiles = files.filter(file => file.endsWith('.png'));
        const imagePaths = imageFiles.map(file => `/capture/${file}`);

        res.json(imagePaths);
    } catch (error) {
        console.error('Error reading capture folder:', error);
        res.status(500).send('Error reading capture folder');
    }
});

// Download latest image
app.get('/download', (req, res) => {
    if (latestImage) {
        const imagePath = path.join(__dirname, latestImage);
        res.download(imagePath, 'captured_image.png');
    } else {
        res.status(404).send('No image to download');
    }
});

// Delete latest image
app.delete('/delete', async (req, res) => {
    try {
        if (latestImage) {
            const imagePath = path.join(__dirname, latestImage);
            await fs.unlink(imagePath);
            latestImage = '';
            res.send('Latest image deleted');
        } else {
            res.status(400).send('No image to delete');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).send('Error deleting image');
    }
});

// Delete specific image by path
app.delete('/delete-image', async (req, res) => {
    const { imagePath } = req.body;
    const absolutePath = path.join(__dirname, imagePath);

    try {
        await fs.unlink(absolutePath);
        res.send('Image deleted');
    } catch (error) {
        console.error('Error deleting specific image:', error);
        res.status(500).send('Failed to delete image');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
