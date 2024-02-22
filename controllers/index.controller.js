//Módulo de Express
const express = require('express');
const app = express();

//Modulo de inicio de sesion
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

//Conexión a postgresql
const {Pool} = require('pg');

const pool = new Pool ({
    connectionString: process.env.DATABASE_URL
});


//Módulo de la IA
const { GoogleGenerativeAI } = require("@google/generative-ai");

//Módulo para convertir a json
const bodyParser = require('body-parser');
require('dotenv').config();

// Accedemos a la APIKEY de la IA
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
app.use(bodyParser.json());

// Definir una ruta GET para obtener recursos didácticos en formato JSON
const postIA = async (req, res) => {
    const materia = req.body.materia;
    try {
        const recursos = await obtenerRecursos(materia);
        res.json(recursos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ocurrió un error al obtener los recursos.' });
    }
};
  
 // Función para obtener recursos didácticos utilizando tu función de generación
 async function obtenerRecursos(materia) {
    const prompt = `puedes darme 5 recursos didácticos en la materia de ${materia} con estructura json sin los 3 puntos?`;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Remover las comillas triples invertidas y espacios innecesarios al inicio y al final
    const jsonText = response.text().replace(/^```\s+/, '').replace(/\s+```$/, '');

    console.log('Contenido de jsonText:', jsonText);
    // Convertir el texto a un objeto JSON
    const recursosJSON = JSON.parse(jsonText);

    let recursosFieldName; // Nombre del campo que contiene los recursos
    let recursosData; // Datos de los recursos

    // Buscar el campo que contiene los recursos
    for (const key in recursosJSON) {
        if (Array.isArray(recursosJSON[key])) {
            recursosFieldName = key;
            recursosData = recursosJSON[key];
            break;
        }
    }

    if (!recursosFieldName || !recursosData) {
        throw new Error('No se encontró ningún campo que contenga los recursos.');
    }

    // Extraer solo los atributos de cada recurso y crear un nuevo arreglo con ellos
    const atributosRecursos = recursosData.map(recurso => {
        const atributos = {};
        for (const key in recurso) {
            if (key !== recursosFieldName) {
                atributos[key] = recurso[key];
            }
        }
        return atributos;
    });

    return atributosRecursos;
}

//GET
//Listar Materias
const getMaterias = async (req, res) => {
    try {
        const response = await pool.query('SELECT * FROM materias');
        res.status(200).json(response.rows); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las materias.' });
    }
}

//Listar cursos pantalla principal
const listarCursos = async (req, res) => {
    try {
        const query = `
        SELECT a.id_recurso, m.nombre AS materia, 
        rm.titulo AS titulo_recurso_metodologico, 
        a.titulo AS titulo_actividad, 
        p.nombres, 
        p.apellidos
 FROM materias m
 INNER JOIN recurso_metodologico rm ON m.id_materia = rm.id_materia
 INNER JOIN actividad a ON rm.id_recurso = a.id_recurso
 INNER JOIN persona p ON rm.id_persona = p.id_persona
 INNER JOIN usuario u on p.id_persona = u.id_persona`;

        const result = await pool.query(query);
        const listadecursos = result.rows;

        res.status(200).json({ listadecursos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

//Listar por usuario
const listarCursosUsuario = async (req, res) => {
    try {
        const id_usuario = req.params.id_usuario; // Obtener el id_usuario de la URL

        const query = `
            SELECT m.nombre AS materia, 
                   rm.titulo AS titulo_recurso_metodologico, 
                   a.titulo AS titulo_actividad, 
                   p.nombres, 
                   p.apellidos
            FROM materias m
            INNER JOIN recurso_metodologico rm ON m.id_materia = rm.id_materia
            INNER JOIN actividad a ON rm.id_recurso = a.id_recurso
            INNER JOIN persona p ON rm.id_persona = p.id_persona
            INNER JOIN usuario u ON p.id_persona = u.id_persona
            WHERE u.id_usuario = $1`; // Filtrar por id_usuario

        const result = await pool.query(query, [id_usuario]);
        const listaDeCursos = result.rows;

        res.status(200).json({ listaDeCursos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

//Listar actividad estudiante
const listarActividadesEstudiante = async (req, res) => {
    try {
        const id_persona = req.params.id_persona; // Obtener el id_persona de la URL

        const query = `
            SELECT p.nombres AS nombre, 
                   p.apellidos, 
                   a.nombre AS actividad, 
                   a.calificacion
            FROM actividad_estudiante a
            INNER JOIN usuario u ON a.id_usuario = u.id_usuario
            INNER JOIN persona p ON p.id_persona = u.id_persona
            WHERE u.id_persona = $1`; // Filtrar por id_persona

        const result = await pool.query(query, [id_persona]);
        const listaDeActividades = result.rows;

        res.status(200).json({ listaDeActividades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

//Listar actividades no realizadas
const listarActividadesPendientes = async (req, res) => {
    try {
        const id_persona = req.params.id_persona; // Obtener el id_persona de la URL
        const query = 
        `SELECT rm.id_recurso,
                   m.nombre as materia,
                   a.titulo as actividad, 
                   a.contenido as instruccion
            FROM actividad a
            INNER JOIN recurso_metodologico rm ON rm.id_recurso = a.id_recurso
            INNER JOIN materias m ON m.id_materia = rm.id_materia
            LEFT JOIN actividad_estudiante ae ON a.id_actividad = ae.id_actividad AND ae.id_usuario = $1
            WHERE ae.id_actividad IS NULL`;

        const result = await pool.query(query, [id_persona]);
        const listaDeActividades = result.rows;

        res.status(200).json({ listaDeActividades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

//Detalle del recurso (mientras realiza la actividad)
const DetalleRecurso = async (req, res) => {
    try {
        const id_recurso = req.params.id_recurso; // Obtener el id_recurso de la URL

        const query = `
            SELECT m.nombre as materia,
                   rm.titulo as titulo,
                   rm.contenido,
                   a.contenido as instruccion
            FROM actividad_estudiante ae
            INNER JOIN actividad a ON a.id_actividad = ae.id_actividad
            INNER JOIN recurso_metodologico rm ON rm.id_recurso = a.id_recurso
            INNER JOIN materias m ON m.id_materia = rm.id_materia
            WHERE rm.id_recurso = $1`; // Filtrar por id_recurso

        const result = await pool.query(query, [id_recurso]);
        const listaDeActividades = result.rows;

        res.status(200).json({ listaDeActividades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}


//POST
// Inicio de sesión
const login = async (req, res) => {
    const { nombre_usuario, contrasenia } = req.body;
    try {
        const usuario = await pool.query('SELECT * FROM usuario WHERE nombre_usuario = $1', [nombre_usuario]);
        if (usuario.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }
        
        // Comparar la contraseña proporcionada con la almacenada en texto plano
        if (contrasenia !== usuario.rows[0].contrasenia) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }

        // Generar token JWT
        const token = jwt.sign({ 
            id_usuario: usuario.rows[0].id_usuario,
            nombre_usuario: usuario.rows[0].nombre_usuario,
            id_persona: usuario.rows[0].id_persona,
            tipo_persona: usuario.rows[0].id_tipo_persona
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

// Registrar usuario
const registrarUsuario = async (req, res) => {
    const { nombres, apellidos, correo, fecha_nacimiento, nombre_usuario, contrasenia, id_tipo_persona } = req.body;
    try {
        // Insertar datos de la persona en la tabla persona
        const personaQuery = `
            INSERT INTO persona (nombres, apellidos, correo, fecha_nacimiento) 
            VALUES ($1, $2, $3, $4) RETURNING id_persona`;
        const personaValues = [nombres, apellidos, correo, fecha_nacimiento];
        const personaResult = await pool.query(personaQuery, personaValues);
        const idPersona = personaResult.rows[0].id_persona;

        // Insertar datos de la cuenta de usuario en la tabla usuario
        const usuarioQuery = `
            INSERT INTO usuario (id_persona, nombre_usuario, contrasenia, id_tipo_persona) 
            VALUES ($1, $2, $3, $4)`;
        const usuarioValues = [idPersona, nombre_usuario, contrasenia, id_tipo_persona];
        await pool.query(usuarioQuery, usuarioValues);

        res.status(201).json({ mensaje: 'Usuario registrado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

// Registrar recurso
const registrarRecursoMetodologico = async (req, res) => {
    const { titulo, contenido, id_materia, id_persona } = req.body;
    try {
        // Insertar datos del recurso metodológico en la tabla recurso_metodologico
        const query = `
            INSERT INTO recurso_metodologico (titulo, contenido, id_materia, id_persona) 
            VALUES ($1, $2, $3, $4) RETURNING id_recurso`;
        const values = [titulo, contenido, id_materia, id_persona];
        const result = await pool.query(query, values);

        const idRecursoMetodologico = result.rows[0].id_recurso;

        res.status(201).json({ idRecursoMetodologico });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

// Registrar actividad
const registrarActividad = async (req, res) => {
    const { titulo, contenido, id_recurso } = req.body;
    try {
        // Insertar datos de la actividad en la tabla actividad
        const query = `
            INSERT INTO actividad (titulo, contenido, id_recurso) 
            VALUES ($1, $2, $3) RETURNING id_actividad`;
        const values = [titulo, contenido, id_recurso];
        const result = await pool.query(query, values);

        const idActividad = result.rows[0].id_actividad;

        res.status(201).json({ idActividad });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

// Registrar actividad estudiante
const registrarActividadEstudiante = async (req, res) => {
    const { nombre, respuesta, id_actividad, id_usuario } = req.body;
    try {
        // Insertar datos de la actividad del estudiante en la tabla actividad_estudiante
        const query = `
            INSERT INTO actividad_estudiante (nombre, respuesta, id_actividad, id_usuario) 
            VALUES ($1, $2, $3, $4) RETURNING id_actividad_estudiante`;
        const values = [nombre, respuesta, id_actividad, id_usuario];
        const result = await pool.query(query, values);

        const idActividadEstudiante = result.rows[0].id_actividad_estudiante;

        res.status(201).json({ idActividadEstudiante });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

//PUT
//Editar calificación actividad estudiante
const editarActividadEstudiante = async (req, res) => {
    const { nombre, respuesta, calificacion } = req.body;
    const id_actividad_estudiante = req.params.id; // Obtener el ID desde los parámetros de la ruta
    try {
        // Actualizar los datos de la actividad del estudiante en la tabla actividad_estudiante
        const query = `
            UPDATE actividad_estudiante 
            SET nombre = $1, respuesta = $2, calificacion = $3
            WHERE id_actividad_estudiante = $4`;
        const values = [nombre, respuesta, calificacion, id_actividad_estudiante];
        await pool.query(query, values);

        res.status(200).json({ mensaje: 'Actividad del estudiante actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}
const listar_actividad_estudiante = async (req, res) => {
    try {
        const id_persona = req.params.id_persona; // Obtener el id_persona de la URL

        const query = 
        `SELECT ae.id_actividad_estudiante,
                   m.nombre AS materia,
                   a.titulo AS actividad, 
                   p.nombres,
                   p.apellidos,
                   ae.calificacion
            FROM actividad_estudiante ae
            LEFT JOIN actividad a ON ae.id_actividad = a.id_actividad
            INNER JOIN usuario u ON ae.id_usuario = u.id_usuario
            INNER JOIN recurso_metodologico rm ON rm.id_recurso = a.id_recurso
            INNER JOIN materias m ON m.id_materia = rm.id_materia
            INNER JOIN persona p ON p.id_persona = u.id_persona
            WHERE rm.id_persona = $1;`

        const result = await pool.query(query, [id_persona]);
        const listaDeActividades = result.rows;

        res.status(200).json({ listaDeActividades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

module.exports =
{
    getMaterias,
    listarCursos,
    listarCursosUsuario,
    listarActividadesEstudiante,
    DetalleRecurso,
    postIA,
    login,
    registrarUsuario,
    registrarRecursoMetodologico,
    registrarActividad,
    registrarActividadEstudiante,
    editarActividadEstudiante,
    listarActividadesPendientes,
    listar_actividad_estudiante
}