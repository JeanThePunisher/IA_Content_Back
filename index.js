//Módulo de Express
const express = require('express');
const app = express();

// Middleware para habilitar CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Permitir solicitudes desde cualquier origen
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Métodos HTTP permitidos
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Encabezados permitidos
  next();
});

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
  
  
  