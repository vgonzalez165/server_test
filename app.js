import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises'
import fs from 'fs';
import gpxParser from 'gpxparser';

// Para poder acceder a la variable __filename desde un módulo ES
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clave para el JWT
const secret = 'This 1s S3cr3T';

// Importamos los JSON con los datos de usuarios y rutas precargados
const usersFile = await readFile('./data/users.json', 'utf-8')
const users = JSON.parse(usersFile);
const routesFile = await readFile('./data/routes.json', 'utf-8');
const routes = JSON.parse(routesFile);


// Servidor web Express
let app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(cors())

const PORT = 5000;
app.listen( PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
})


// *************************************************************************
// Páginas estáticas
// *************************************************************************

// Raíz. Muestra la página HTML
app.get("/", (req, res, next) => {
    res.sendFile( path.join(__dirname, './index.html') );
});

app.get("/form", (req, res) => {
    res.sendFile( path.join(__dirname, './form.html') );
})

function generateAccessToken(username) {
    return jwt.sign(username, secret, { expiresIn: '86400s' }); // Caducidad de 1 día
  }



// *************************************************************************
// Funciones para el USUARIO
// *************************************************************************

// POST /api/login
app.post("/api/login", (req, res) => {
    const {username, pass} = req.body;
    let user = users.find( (item) => item.username.toLowerCase() == username.toLowerCase() && item.pass == pass);
    if ( user ) {
        const token = generateAccessToken({ username: req.body.username });
        res.status(200).json({
            success: true,
            username,
            id: user.id,
            token
        });
    } else {
        res
            .status(401)
            .json({
                success: 'false',
                msg: 'Credenciales no válidas'
            })
    }
})

// POST /api/register
app.post("/api/register", (req, res, next) => {
    // Estructura del JSON
    // {
    //     fullname: '',
    //     username: '',
    //     email: '',
    //     pass: '',
    //     height: '',
    //     weight: '',
    //     birthday: '',
    //     activities: ''
    // }
    // Estructura del JSON de vuelta:
    // {
    //     success: true|false,
    //     msg: '',     // ERROR: Mensaje del error
    //     code: ''     // ERROR: Código del error
    //     id: ''       // ÉXITO: identificador asignado al usuario
    // }
    
    let {fullname, username, email, pass, height, weight, birthday, activities} = req.body;

    // ERROR: algún campo está vacío
    if (!(fullname && username && email && pass && height && weight && birthday && activities)) {
        res.status(400)     // Bad request
           .json( {
                success: false,
                msg: "Alguno de los campos es incorrecto o está vacío",
                code: "001"
           });
        return;
    }

    // ERROR: el usuario que ya existe
    if ( users.find( (item) => item.username == username )) {
        res.status(409)     // Conflict
           .json( {
                success: false,
                msg: "El nombre de usuario ya existe",
                code: "002"
           })
        return;
    }

    // ÉXITO. Aquí la guardo en memoria
    const id = randomUUID();
    users.push({
        id,
        fullname,
        username,
        email,
        pass,   // Por comodidad la guardo en plano, pero habría que guardar su hash en la base de datos
        height,
        weight,
        birthday,
        activities,
        active: true
    })
    res.status(200)
       .json( {
            success: true,
            id,
            msg: "Se ha creado el usuario",
        } )
    }
)

// GET /api/ckeckuser
app.get('/api/checkuser', (req, res) => {
    let username = req.query?.username;

    if (!username) {
        res.status(400)
           .json({
                success: false,
                msg: "No se ha indicado el nombre del parámetro"
           })
    }

    // Buscamos el nombre de usuario en la base de datos (en este caso nuestro array)
    if (users.filter( (item) => item.username == username).length == 0) {
        res.status(200) 
           .json( {
                username,
                "exists": false
        })
    } else {
        res.status(200) 
           .json( {
                username,
                "exists": true
           })
    }
})


// GET /api/users
app.get('/api/users', (req, res) => {
    res.status(200)
       .json(users.filter( (item) => item.active ));
})


function isValidToken(token, username) {
    try {
        const json = jwt.verify(token, secret);
        return (json.username == username);
    } catch (e) {
        return false;
    }
}


// DELETE /api/user?id=XXXXX  || /api/users?username=XXXX
app.delete('/api/user', (req, res) => {

    let {id} = req.query;
    let {username} = req.query;
    let token = req.headers.authorization;
    let user;
    if (id) {
        user = users.find( (item) => item.id == id && item.active );
    } else if (username) {
        user = users.find( (item) => item.username == username && item.active );
    } else {
        res.status(400).json({
            success: false,
            msg: "Falta el id o el nombre del usuario"
        })
        return;
    }

    if (!user) {
        res.status(400).json(({
            success: false,
            msg: "El usuario no existe"
        }));
        return;
    }

    if (!isValidToken(token, user.username)) {
        res.status(401).json({
            success: false,
            msg: "Token no válido"
        });
        return;
    }

    if (user) {
        user.active = false;
        res.status(200).json({
            success: true,
            msg: "Se ha eliminado correctamente el usuario"
        })
    } else {
        res.status(404).json({
            success: false,
            msg: "No se ha encontrado el usuario"
        })
    }
})


// GET /api/user?id=XXXXX  || /api/user?username=XXXX
app.get('/api/user', (req, res) => {

    let {id} = req.query;
    let {username} = req.query;
    let token = req.headers.authorization;
    let user;
    if (id) {
        user = users.find( (item) => item.id == id && item.active );
    } else if (username) {
        user = users.find( (item) => item.username == username && item.active );
    } else {
        res.status(400).json({
            success: false,
            msg: "Falta el id o el nombre del usuario"
        })
        return;
    }

    if (!user) {
        res.status(400).json(({
            success: false,
            msg: "El usuario no existe"
        }));
        return;
    }

    if (!isValidToken(token, user.username)) {
        res.status(401).json({
            success: false,
            msg: "Token no válido"
        });
        return;
    }

    if (user) {
        res.status(200).json(user)
    } else {
        res.status(404).json({
            success: false,
            msg: "No se ha encontrado el usuario"
        })
    }

})

 
// PUT /api/users
app.put('/api/user', (req, res) => {
    let {id, email, pass, height, weight, birthday, activities} = req.body;
    let token = req.headers.authorization;

    let user = users.find( (item) => item.id == id);

    console.log(user)

    if (!user) {
        res.status(400).json({
            success: false,
            msg: "Identificador no válido"
        });
        return;
    }

    if (!isValidToken(token, user.username)) {
        res.status(401).json({
            success: false,
            msg: "Token no válido"
        });
        return;
    }
    
    if (user) {
        // if (fullname) user.fullname = fullname;  // No se puede cambiar el nombre de usuario
        if (email) user.email = email;
        if (pass) user.pass = pass;
        if (weight) user.weight = weight;
        if (height) user.height = height;
        if (birthday) user.birthday = birthday;
        if (activities) user.activities = activities;
        res.status(200)
           .json({
                success: true
           })
    } else {
        res.status(400)
           .json({
            success: false,
            msg: "El usuario no existe"
           })
    }


})


// *************************************************************************
// Funciones para las RUTAS
// *************************************************************************

// GET /api/routes
app.get('/api/routes', (req, res) => {
    res.status(200)
       .json(routes);
})


// Para eliminar
// GET /api/route/gpx?id=XXXX
app.get('/api/route/gpx', (req, res) => {
    let id = req.query.id;
    let route = routes.find( (item) => {
        return item.id == id 
    });

    if (!route) {
        res.status(400);
        return;
    } else {
        res.status(200).json({success: true})
    }
})


app.get('/api/route', (req, res) => {
    let filteredRoutes=routes;
    // Nombre de ruta ?name=XXXX
    if (req.query.name) {
        filteredRoutes = filteredRoutes.filter( item => item.route_name.toLowerCase().includes(req.query.name.toLowerCase()));
    }

    // Distancia mínima ?min_dist=XXX   (en metros)
    if (req.query.min_dist) {
        filteredRoutes = filteredRoutes.filter( item => item.distance > +req.query.min_dist );
    }

    // Distancia máxima ?max_dist=XXX   (en metros)
    if (req.query.max_dist) {
        filteredRoutes = filteredRoutes.filter( item => item.distance < +req.query.max_dist );
    }

    // Desnivel mínimo ?min_slope=XXX   (en metros)
    if (req.query.min_slope) {
        filteredRoutes = filteredRoutes.filter( item => item.slope > +req.query.min_slope );
    }

    // Desnivel máximo ?max_slope=XXX   (en metros)
    if (req.query.max_slope) {
        filteredRoutes = filteredRoutes.filter( item => item.slope < +req.query.max_slope );
    }

    // Circular ?circular=XX            (true|false)
    if (req.query.circular) {
        filteredRoutes = filteredRoutes.filter( item => item.circular != (req.query.circular  == 'false') );
    }

    // User ?user=XX                    (identificador del usuario)
    if (req.query.user) {
        filteredRoutes = filteredRoutes.filter( item => item.user == req.query.user);
    }

    // Dif ?dif=XX                    (identificador del usuario)
    if (req.query.dif) {
        filteredRoutes = filteredRoutes.filter( item => item.dif == req.query.dif);
    }
    
    res.status(200).json(filteredRoutes);
})


// Recoge un fichero GPX y genera un fichero JSON con los datos relevantes del mismo:
// distancia, altitud, desnivel, punto de inicio, coordenadas de los puntos de paso.
function parseGPX( gpx ) {

    let parser = new gpxParser();
    parser.parse(gpx);
    // let geojson = parser.toGeoJSON()
    // console.log(geojson);
    let json = parser.tracks[0] ;

    // Reducimos el número de puntos a aproximadamente 300
    let ratio = Math.round(json.points.length / 300);
    let points = json.points.filter( (_, index) => index%ratio == 0);
    console.log(points)
    let slopes = json.slopes.filter( (_, index) => index%ratio == 0);
    console.log(ratio);
    console.log(json);
    let distance = json.distance?.total;
    let max_height = json.elevation?.max;
    let min_height = json.elevation?.min;
    let pos_slope = json.elevation?.pos;
    let neg_slope = json.elevation?.neg;
    let start_lat = json.points[0].lat;
    let start_lon = json.points[0].lon;
    return {
        distance,
        max_height,
        min_height,
        pos_slope,
        neg_slope,
        start_lat,
        start_lon,
        points,
        slopes
    }
}


app.post('/api/route', (req, res) => {
    let {route_name, id, desc, gpx, dif} = req.body;
    if (!(route_name && id && desc && gpx)) {
        res.status(400).json({
            success: false,
            msg: "Falta algún campo obligatorio"
        })
    } else if (!users.find( item => item.id == id )) {
        res.status(409).json({
            success: false,
            msg: "El id de usuario no es válido"
        })
    } else {
        let data = parseGPX(gpx);
        routes.push( {...data, route_name, desc, dif: dif?dif:1} );
        routes.forEach( item => console.log(item.points) )
        res.status(200).json({
            success: true,
            msg: "Se ha añadido la ruta"
        });
        
    }
})

