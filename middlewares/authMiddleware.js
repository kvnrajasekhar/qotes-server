
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    // Get the token from the Authorization header (Bearer token)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the token signature and expiration
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach the user info to the request for use in route handlers
        req.user = decoded; 
        
        next(); // Token is valid, continue to the route handler
    } catch (err) {
        // Token expired, invalid signature, or other error
        return res.status(403).json({ message: 'Invalid or expired access token' });
    }
};

module.exports = authMiddleware;