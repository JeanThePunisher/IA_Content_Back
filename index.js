//Módulo de Express
const express = require('express');
const cors = require('cors');
const app = express();
//CORS
app.use(cors());

//middlewares
app.use(express.json());
app.use(express.urlencoded({extended: false}));

//routes
app.use(require('./routers/index'));


  // Iniciar el servidor
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
