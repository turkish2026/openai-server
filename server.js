const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

//const API_KEY = "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"; 

// Middleware для обработки JSON
app.use(express.json());

// Обработчик POST-запроса для работы с OpenAI
app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).send({ error: "Incorrect request format." });
    }

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: messages,
            },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                }
            }
        );

        res.send(response.data);
    } catch (error) {
        console.error("Error API:", error.message);
        res.status(500).send({ error: "Error server or OpenAI API." });
    }
});

app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}`);
});
