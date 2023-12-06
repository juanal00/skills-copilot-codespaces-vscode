// Create web server

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Store comments in memory
const commentsByPostId = {};

// Handle GET request to /posts/:id/comments
app.get('/posts/:id/comments', (req, res) => {
  // Get comments for post id
  res.send(commentsByPostId[req.params.id] || []);
});

// Handle POST request to /posts/:id/comments
app.post('/posts/:id/comments', async (req, res) => {
  // Generate a random id for comment
  const commentId = require('crypto')
    .randomBytes(4)
    .toString('hex');

  // Get content from request body
  const { content } = req.body;

  // Get comments for post id
  const comments = commentsByPostId[req.params.id] || [];

  // Add new comment to comments
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments for post id
  commentsByPostId[req.params.id] = comments;

  // Post event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  // Send response
  res.status(201).send(comments);
});

// Handle POST request to /events
app.post('/events', async (req, res) => {
  // Get event from request body
  const { type, data } = req.body;

  // Log event type
  console.log(`Received event: ${type}`);

  // Check event type
  if (type === 'CommentModerated') {
    // Get comments for post id
    const comments = commentsByPostId[data.postId];

    // Find comment with id
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });

    // Update comment status
    comment.status = data.status;

    // Post event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        postId: data
