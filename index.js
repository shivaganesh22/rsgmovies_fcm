var cron = require('node-cron');
const axios = require('axios');
const { Pool } = require('pg');
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3030;
function sendFCMNotification(title, body, image, link) {
    const url = 'https://fcm.googleapis.com/fcm/send';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'key=AAAAhHqY1L0:APA91bF76GAl0BG_JOc9UNOTmQCBAA8irf_7z9zRRIr7NmvM3Gr4VYYTnHAMLb-ZP-td473Bfjek76dYR81a0xnRRFkPihOeTdA8quIotP8uw685M6ZjZJrL-jokGGreuRywtYd7JdJj',  // Replace YOUR_SERVER_KEY with your Firebase Server key
    };
    const payload = {
        to: '/topics/movies',
        data: {  
            link: link,
        },
        notification: {
            title: title,
            body: body,
            image: image,
        },
    };

    axios.post(url, payload, { headers: headers })
        .then(response => {
            console.log(body);
        })
        .catch(error => {
            console.error("Failed to send notification:", error.response.data);
        });
}
const pool = new Pool({
    user: 'default',
    host: 'ep-yellow-dust-85172855-pooler.us-east-1.postgres.vercel-storage.com',
    database: 'verceldb',
    password: 'Rzj6pDnru0ke',
    port: 5432, 
    ssl: {
        rejectUnauthorized: false,
      }
  });

async function movierulz_fcm() {
    try {
        const response = await axios.get("https://rsg-movies.vercel.app/react/movierulz/");
        const data = response.data.movies;
        const queryResult = await pool.query("SELECT * FROM app_movierulz");
        const movies = queryResult.rows;
        for (const i of data) {
            const found = movies.some(movie => movie.name === i.name);
            if (!found) {
                sendFCMNotification("Movierulz Movie Update", i.name, i.image, '/movierulz/movie?link=' + i.link);
            }
        }
        await pool.query("DELETE FROM app_movierulz");

       
        if (data.length > 0) {
            const insertQuery = "INSERT INTO app_movierulz (name, image, link) VALUES ($1,$2,$3)";
            const values = data.map(movie => [movie.name, movie.image, movie.link]);
            await Promise.all(values.map(value => pool.query(insertQuery, value)));
        }
    } catch (error) {
        console.error(error);
    }
}
async function ibomma_fcm() {
    try {
        const response = await axios.get("https://rsg-movies.vercel.app/api/ibomma/");
        const data = response.data.movies;
        const queryResult = await pool.query("SELECT * FROM app_ibomma");
        const movies = queryResult.rows;
        for (const i of data) {
            const found = movies.some(movie => movie.name === i.name);
            if (found) {
                sendFCMNotification("IBomma Movie Update", i.name, i.image, '/ibomma/movie?link=' + i.link);
            }
        }
        await pool.query("DELETE FROM app_ibomma");

       
        if (data.length > 0) {
            const insertQuery = "INSERT INTO app_ibomma (name, image, link) VALUES ($1,$2,$3)";
            const values = data.map(movie => [movie.name, movie.image, movie.link]);
            await Promise.all(values.map(value => pool.query(insertQuery, value)));
        }
    } catch (error) {
        console.error(error);
    }
}

cron.schedule('*/5 * * * *', () => {
movierulz_fcm();
ibomma_fcm();
});
app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`);
  });