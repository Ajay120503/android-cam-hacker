const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Ensure the 'capture' folder exists
const captureFolderPath = path.join(__dirname, 'capture');
if (!fs.existsSync(captureFolderPath)) {
    fs.mkdirSync(captureFolderPath);
}

let latestImage = ''; // Store the latest image file path

// Serve static files (index.html, js, css) from the root directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'capture' folder
app.use('/capture', express.static(captureFolderPath));

// Handle GET / route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle POST /upload route to receive image
app.post('/upload', (req, res) => {
    const { image } = req.body;
    const base64Data = image.replace(/^data:image\/png;base64,/, ''); // Remove data URL prefix
    const fileName = `captured_image_${Date.now()}.png`; // Unique filename using timestamp
    const filePath = path.join(captureFolderPath, fileName); // Save inside 'capture' folder

    // Write the image to the file system
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Error saving the image:', err);
            return res.status(500).send('Error saving image');
        }
        latestImage = `/capture/${fileName}`; // Update the path to the image in 'capture' folder
        res.send('Image received and saved');
    });
});

// Handle GET /latest-images route to send all captured images
app.get('/latest-images', (req, res) => {
    fs.readdir(captureFolderPath, (err, files) => {
        if (err) {
            console.error('Error reading capture folder:', err);
            return res.status(500).send('Error reading capture folder');
        }

        // Filter out non-image files and only return PNG images
        const imageFiles = files.filter(file => file.endsWith('.png'));
        if (imageFiles.length > 0) {
            // Send the list of image file paths as JSON
            const imagePaths = imageFiles.map(file => `/capture/${file}`);
            res.json(imagePaths); // Send the list of all image URLs
        } else {
            res.status(404).send('No images found');
        }
    });
});

// Handle GET /download route to send the latest image file to download
app.get('/download', (req, res) => {
    if (latestImage) {
        const imagePath = path.join(__dirname, latestImage);
        res.download(imagePath, 'captured_image.png', (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error downloading image');
            }
        });
    } else {
        res.status(404).send('No image to download');
    }
});

// Handle DELETE /delete route to remove the latest image
app.delete('/delete', (req, res) => {
    if (latestImage) {
        const imagePath = path.join(__dirname, latestImage);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error('Error deleting the image:', err);
                return res.status(500).send('Error deleting image');
            }
            latestImage = ''; // Reset the latest image
            res.send('Image deleted successfully');
        });
    } else {
        res.status(400).send('No image to delete');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
