var rawValues = [
    'modbus.0.holdingRegisters.1.40083_W',
    'modbus.0.holdingRegisters.1.40100_DCW',
    'modbus.0.holdingRegisters.1.40274_1_DCW',
    'modbus.0.holdingRegisters.1.40294_2_DCW',
    'modbus.0.holdingRegisters.1.40314_3_DCW',
    'modbus.0.holdingRegisters.1.40334_4_DCW',
    'modbus.0.holdingRegisters.1.40351_ChaState',
    'modbus.0.holdingRegisters.200.40087_W'
];

var register = [];
var timer;
var count = 0;

rawValues.forEach(function(item,index,array) {
    register[item] = getState(item).val;
});

on({id: rawValues}, function(data) {
    clearTimeout(timer);
    register[data.id] = data.state.val;
    timer = setTimeout(processRawValues, 500, data.id);
});

function processRawValues(current) {
    count = count + 1;
    var DCLeistungGesamt = register['modbus.0.holdingRegisters.1.40274_1_DCW'] + register['modbus.0.holdingRegisters.1.40294_2_DCW'];
    setState('0_userdata.0.Energie.PV.LeistungGesamt', DCLeistungGesamt,true);
    setState('0_userdata.0.Energie.LeistungAktuell',Math.round(getState('modbus.0.holdingRegisters.1.40083_W').val + getState('modbus.0.holdingRegisters.200.40087_W').val),true);
    var impexp = register['modbus.0.holdingRegisters.200.40087_W'];
    if(impexp > 0) { impexp = 0; }
    var direkt = Math.round(register['modbus.0.holdingRegisters.1.40083_W']-(register['modbus.0.holdingRegisters.1.40083_W']*register['modbus.0.holdingRegisters.1.40334_4_DCW']/register['modbus.0.holdingRegisters.1.40100_DCW'])+impexp);
    if(direkt > 0) { setState('0_userdata.0.Energie.Direktverbrauch', direkt,true); }

    let svg = "<svg width='320' height='320'>";
    svg += "<mask id='cut2'><rect y='0' x='0' width='100%' height='100%' fill='white'/><rect y='155' x='0' width='100%' height='10'/><rect y='0' x='155' width='10' height='100%'/></mask>";

    //Autarkie
    var autarkie = 100 - Math.round(100*getState('0_userdata.0.Energie.Netz.Zaehler_Import_Tag_Laufend').val/getState('0_userdata.0.Energie.Verbrauch_Tag_Laufend').val);
    svg += "<g id='rings' mask='url(#cut2)'><path = d='" + describeArc(160,160,105,2,Math.round((86*autarkie/100)+2)) + "' stroke='" + getColor(autarkie) + "' stroke-width='10' fill='none'/>";

    //Ladezustand EV
    var ladezustand = getState('mercedesme.0.W1K177***.state.soc.intValue').val;
    svg += "<path = d='" + describeArc(160,160,105,92,Math.round((86*ladezustand/100)+92)) + "' stroke='" + getColor(ladezustand) + "' stroke-width='10' fill='none'/>";

    //Ladezustand BYD
    var batterie = register['modbus.0.holdingRegisters.1.40351_ChaState']
    svg += "<path = d='" + describeArc(160,160,105,182,Math.round((86*batterie/100)+182)) + "' stroke='" + getColor(batterie) + "' stroke-width='10' fill='none'/>";

    //Ertrag
    var ertrag = (DCLeistungGesamt / 9300)*100;
    svg += "<path = d='" + describeArc(160,160,105,272,Math.round((86*ertrag/100)+272)) + "' stroke='" + getColor(ertrag) + "' stroke-width='10' fill='none'/>";

    //Test += "<line x2='320' y1='0' x1='0' y2='320' stroke='yellow' stroke-width='1' />";
    //Test += "<line x2='0' y1='0' x1='320' y2='320' stroke='yellow' stroke-width='1' />";
    svg += "</g></svg>";

    setState('0_userdata.0.Energie.VisHtml_Overview', svg, true);
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, radius, startAngle, endAngle){

    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);

    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return d;       
}