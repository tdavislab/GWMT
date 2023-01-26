from ssl import OP_ALL
from flask import Flask, render_template, jsonify, request
from dataProcessor.utils import load_json_data, load_SF_data

app = Flask(__name__)
dataName = 'HeatedFlow'     # HeatedFlowVelocity

@app.route("/")
def index():
   return render_template("index.html")

@app.route("/changeData", methods=['POST'])
def changeData():
    global dataName
    paras = request.get_json()
    dataName = paras['data']
    return jsonify(load_json_data(dataName))


@app.route("/getTGData", methods=['POST'])
def getTGData():
    global dataName 
    dataName = 'HeatedFlow'
    return jsonify(load_json_data(dataName))    # VortexWithMin HeatedFlowVelocity IonizationFront jungtelziemniak

@app.route("/getScalarFields", methods=['POST'])
def getScalarFields():
    ''' return the scalar fields data according to the give timstamps
    Args: 
        {tRange: [0, 7]}
        tDict: {'LL-SF': t-2, 'L-SF': t-1, 'SF': t, 'SF-R': t+1, 'SF-RR': t+2}
    
    Returns:
        {'LL-SF': [scalar filed], 'L-SF': [], 'SF': t, []: t+1, 'SF-RR': []}
    '''
    global dataName
    paras = request.get_json()
    print(paras)
    scalarFieldsLst = []
    for t in range(paras['tRange'][0], paras['tRange'][1]+1):
        scalarFieldsLst.append(load_SF_data(dataName, t))
    return jsonify(scalarFieldsLst)


if __name__ == '__main__':
   app.run(debug = True)