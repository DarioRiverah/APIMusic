from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config


def create_app(config=None, servicios=None):
    """Crea la app. En pruebas se pasan `servicios` en memoria;
    en producción se conectan a Firebase."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)

    CORS(app, origins=app.config['CORS_ORIGENES'])

    if servicios is None:
        from .servicios.firebase import crear_servicios_firebase
        servicios = crear_servicios_firebase(app.config)
    app.extensions['servicios'] = servicios

    from .auth import bp as auth_bp
    from .canciones import bp as canciones_bp
    from .playlists import bp as playlists_bp
    from .favoritos import bp as favoritos_bp
    from .artistas import bp as artistas_bp
    from .albumes import bp as albumes_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(artistas_bp)
    app.register_blueprint(albumes_bp)
    app.register_blueprint(canciones_bp)
    app.register_blueprint(playlists_bp)
    app.register_blueprint(favoritos_bp)

    @app.get('/')
    def root():
        return jsonify({'message': 'Bienvenido a APIMusic 🎵',
                        'recursos': ['/auth', '/songs', '/artists', '/albums',
                                     '/playlists', '/me/favorites']})

    @app.get('/genres')
    def generos():
        return jsonify(list(app.config['GENEROS']))

    @app.errorhandler(404)
    def no_encontrado(_):
        return jsonify({'error': 'Ruta no encontrada'}), 404

    @app.errorhandler(405)
    def metodo_no_permitido(_):
        return jsonify({'error': 'Método no permitido'}), 405

    @app.errorhandler(413)
    def muy_grande(_):
        return jsonify({'error': 'El archivo es demasiado grande'}), 413

    return app