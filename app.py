from flask import Flask, jsonify, request
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)


@app.route('/estado', methods=['GET'])
def estado_servidor():
    return jsonify({"mensaje": "¡Cerebro Python de Adapta PE en línea! 🇵🇪"})


@app.route('/analizar_imagen', methods=['POST'])
def analizar():
    # 1. Chrome nos envía la URL de la imagen que el usuario está señalando
    datos = request.get_json()
    img_src = datos.get('src')

    print(f"[PYTHON] 👁️ Ojo Biónico activado. Analizando imagen: {img_src}")

    # 2. AQUÍ VA LA INTELIGENCIA ARTIFICIAL EN EL FUTURO
    # modelo_ia = cargar_modelo_visual()
    # descripcion = modelo_ia.mirar(img_src)

    # Simulamos que la IA tarda 1 segundo en "pensar" y procesar los píxeles
    time.sleep(1)

    descripcion_ia = "Análisis de IA: Parece ser un paisaje con montañas y un lago al atardecer."
    print(f"[PYTHON] 🧠 Respuesta generada: {descripcion_ia}")

    # 3. Le devolvemos el texto a la extensión para que lo hable por el TalkBack
    return jsonify({"descripcion": descripcion_ia})


if __name__ == '__main__':
    print("🚀 Servidor de Inteligencia Artificial Adapta PE encendido en el puerto 5000...")
    app.run(port=5000, debug=True)