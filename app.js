const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');   // Para generar un ID único de usuario

const fs=require('fs');
const gpxParser = require('gpxparser');

const secret = 'This 1s S3cr3T';


function parseGPX( filename ) {
    let gpx = new gpxParser();
    gpx.parse(fs.readFileSync(filename, 'utf8'));
    console.log("***************");
    console.log(gpx.tracks[0]);   
}

parseGPX('./01.gpx')

// var gpx = new DOMParser().parseFromString(fs.readFileSync('01.gpx', 'utf8'));

// Base de datos de usuarios. Por comodidad ya hay uno precargado
let users = [
    {
        id: '10b69d2b-26c6-4715-b510-eba42f9766f0',
        username: 'victor',
        fullname: 'Víctor J. González',
        pass: '1234',
        email: 'victor@mail.com',
        height: 170,
        weight: 70,
        birthday: '01/01/2000',
        activities: ['trail'],
        active: true
    },
    {
        id: '10b69d2b-26c6-4715-b510-eba42f9767f0',
        username: 'pepe',
        fullname: 'Pepe Fernández ',
        pass: '1234',
        email: 'pepe@mail.com',
        height: 170,
        weight: 70,
        birthday: '01/01/2000',
        activities: ['trail'],
        active: true
    }
];     

let routes = [
    {
        id: '22a22d2b-26c6-4715-b510-eba42f9767f0',
        route_name: 'Ruta de los Calderones',
        distance: 12270,
        max_height: 1672,
        min_height: 1179,
        pos_slope: 611,
        neg_slope: 611,
        circular: true,
        start_lat: 42.82393,
        start_lon: -5.77881,
        user: '10b69d2b-26c6-4715-b510-eba42f9766f0',
        date: '29/01/2023',
        desc: 'La ruta se inicia en Piedrasecha, para tomar enseguida una vereda casi paralela al río. Destaca una gran roca silícica, muy llamativa por los líquenes amarillentos que la colonizan; es El Serrón. Pronto se llega a la fuente del Manadero y un poco más allá, la Cueva de las Palomas alberga una sencilla ermita rupestre que custodia la imagen de Nuestra Señora del Manadero. Su romería se celebra el último domingo de Julio, congregando a vecinos de toda la comarca. '
    },
    {
        id: '22a22d2b-26c6-4715-b510-eba42f9767f0',
        route_name: 'Subida al Vizcodillo',
        distance: 16390,
        max_height: 2104,
        min_height: 1199,
        pos_slope: 932,
        neg_slope: 929,
        circular: true,
        start_lat: 42.2367748,
        start_lon: -6.4616487,
        user: '10b69d2b-26c6-4715-b510-eba42f9766f0',
        date: '07/07/2022',
        desc: 'A 1,5km pasando Truchillas desde Truchas hay un parking con un panel indicativo para subir al lago Truchillas,hasta el cual llego y atravieso por la salida del agua que forma el rio Truchilas, para subir a una cuota dos mil en primer lugar y acto seguido al Vizcodillo.Descenso por la laguna Malicioso hasta el coche.'
    }
]




let app = express();
app.use(bodyParser.json());
app.use(cors())

const PORT = 5000;
app.listen( PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
})


// Raíz. Muestra la página HTML
app.get("/", (req, res, next) => {
    res.sendFile( path.join(__dirname, './index.html') );
});


function generateAccessToken(username) {
    return jwt.sign(username, secret, { expiresIn: '86400s' }); // Caducidad de 1 día
  }

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


// DELETE /api/users?id=XXXXX  || /api/users?username=XXXX
app.delete('/api/users', (req, res) => {

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



// GET /api/routes
app.get('/api/routes', (req, res) => {
    res.status(200)
       .json(routes);
})


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
    let filteredRoutes=[];
    // Nombre de ruta ?name=XXXX
    if (req.query.name) {
        filteredRoutes = routes.filter( item => item.route_name.toLowerCase().includes(req.query.name.toLowerCase()));
    }

    // Distancia mínima ?min_dist=XXX   (en metros)
    if (req.query.min_dist) {
        filteredRoutes = routes.filter( item => item.distance > +req.query.min_dist );
    }

    // Distancia máxima ?max_dist=XXX   (en metros)
    if (req.query.max_dist) {
        filteredRoutes = routes.filter( item => item.distance < +req.query.max_dist );
    }

    // Desnivel mínimo ?min_slope=XXX   (en metros)
    if (req.query.min_slope) {
        filteredRoutes = routes.filter( item => item.slope > +req.query.min_slope );
    }

    // Desnivel máximo ?max_slope=XXX   (en metros)
    if (req.query.max_slope) {
        filteredRoutes = routes.filter( item => item.slope < +req.query.max_slope );
    }

    // Circular ?circular=XX            (true|false)
    if (req.query.circular) {
        filteredRoutes = routes.filter( item => item.circular != (req.query.circular  == 'false') );
    }

    // User ?user=XX                    (identificador del usuario)
    if (req.query.user) {
        filteredRoutes = routes.filter( item => item.user == req.query.user);
    }
    
    res.status(200).json(filteredRoutes);
})