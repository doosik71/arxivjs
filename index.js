const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const port = 3000;

const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

app.use(express.static(__dirname));
app.use(express.json());

app.get('/api/topics', (req, res) => {
    fs.readdir(dataDir, (err, files) => {
        if (err) {
            res.status(500).send('Error reading topics');
        } else {
            res.json(files);
        }
    });
});

app.post('/api/topics', (req, res) => {
    const newTopic = req.body.topic;
    if (!newTopic || !/^[a-zA-Z0-9가-힣]+$/.test(newTopic)) {
        return res.status(400).send('Invalid topic name');
    }
    const newTopicPath = path.join(dataDir, newTopic);
    fs.mkdir(newTopicPath, (err) => {
        if (err) {
            res.status(500).send('Error creating topic');
        } else {
            res.status(201).send('Topic created');
        }
    });
});

app.delete('/api/topics/:topic', (req, res) => {
    const topic = req.params.topic;
    const topicPath = path.join(dataDir, topic);
    fs.readdir(topicPath, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading topic directory');
        }

        if (files.length > 0) {
            return res.status(400).send('Topic directory is not empty');
        }

        fs.rmdir(topicPath, (err) => {
            if (err) {
                res.status(500).send('Error deleting topic');
            } else {
                res.status(200).send('Topic deleted');
            }
        });
    });
});

app.put('/api/topics/:topic', (req, res) => {
    const oldTopic = req.params.topic;
    const newTopic = req.body.topic;

    if (!newTopic || !/^[a-zA-Z0-9가-힣]+$/.test(newTopic)) {
        return res.status(400).send('Invalid topic name');
    }

    const oldTopicPath = path.join(dataDir, oldTopic);
    const newTopicPath = path.join(dataDir, newTopic);

    fs.rename(oldTopicPath, newTopicPath, (err) => {
        if (err) {
            res.status(500).send('Error renaming topic');
        } else {
            res.status(200).send('Topic renamed');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});