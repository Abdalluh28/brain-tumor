require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const corsOptions = require("./config/corsOptions");
const session = require("express-session");
const port = process.env.PORT || 3000;

const app = express();

connectDB();

// Middleware setup
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());


// Routes
app.use('/', require('./routes/root'));
app.use('/api/auth', require('./routes/authRoutes'));

// Start server after MongoDB connection is established
mongoose.connection.once('open', () => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
});
