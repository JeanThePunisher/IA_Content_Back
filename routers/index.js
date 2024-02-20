const {Router} = require('express');
const router = Router();

const {getMaterias,
    listarCursos,
    listarCursosUsuario,
    listarActividadesEstudiante,
    listarActividadesPendientes,
    DetalleRecurso,
    postIA, 
    login, 
    registrarUsuario, 
    registrarRecursoMetodologico, 
    registrarActividad,
    registrarActividadEstudiante,
    editarActividadEstudiante,
    } = require('../controllers/index.controller')

router.get('/materias', getMaterias);
router.get('/cursos', listarCursos);
router.get('/listar-cursos/:id_usuario', listarCursosUsuario);
router.get('/listar-actividad-estudiante/:id_persona', listarActividadesEstudiante);
router.get('/listar-actividad-pendiente/:id_persona', listarActividadesPendientes);
router.get('/detalle-recurso/:id_recurso', DetalleRecurso);
router.post('/obtenerRecursos', postIA);
router.post('/login', login);
router.post('/registro', registrarUsuario);
router.post('/registro-recurso', registrarRecursoMetodologico);
router.post('/registro-actividad', registrarActividad);
router.post('/registro-actividad-estudiante', registrarActividadEstudiante);
router.put('/editar-actividad-estudiante/:id', editarActividadEstudiante);


module.exports = router;