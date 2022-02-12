/* 
*  Autor : Jofre Eduado Oliveros Gavidia
*  Esri Colombia 
*  Semillero de innovación geográfica
*  App bicicletas Bogotá
*/

require(["esri/config",
         "esri/Map", 
         "esri/views/MapView",
         "esri/layers/FeatureLayer",
         "esri/Graphic",
         "esri/rest/route",
         "esri/rest/support/RouteParameters",
         "esri/rest/support/FeatureSet",
         "esri/symbols/WebStyleSymbol",
         "esri/widgets/Search"
], function(esriConfig,
  Map,
  MapView,
  FeatureLayer,
  Graphic,
  route,
  RouteParameters,
  FeatureSet,
  WebStyleSymbol,
  Search){

    esriConfig.apiKey = "AAPK82fce3bc90fc4b01aa5dd4f9ab31bd933gnunyKFTN--Q9Kogd9KxT9K7TmklKkkb2ErqajhnGkydHXLX0GkvFiaJbo5Rxwr";

    const map = new Map({
        basemap : "osm-standard-relief",
    });

    const view = new MapView({
        map: map,
        center : [-74.08826461430502, 4.643195660693282],
        zoom : 13,
        container: "viewDiv"

    });

    const search = new Search({  //Add Search widget
      view: view
    });
    view.ui.add(search, "top-left"); //Add to the map

    const routeUrl =
    "https://sig.simur.gov.co/arcgis/rest/services/MVI_REDBICI/NARedBici/NAServer/RuteoBici";

    //Trailheads feature layer (points)


  const popupTrailheads = {
    "title": "{NOMBRE_CICP}",
    "content": "<b>Dirección:</b> {DIRECCION}<br><b>Cupos:</b> {CUPOS}<br><b>Tipo:</b> {TIPOLOGIA_CICP}<br><b>"
  }

  const label= {
    type: "label-2d",
    labelExpressionInfo: {
      expression: "$feature.NOMBRE_CICP",
    },
    symbolLayers:[
      {
        type: "text",
        material: {
          color: [0,0,0,0.8]
        },
        font : {
          size: 0,
          //family: "'Spicy Rice', cursive"
        }
      }
    ],
    }

    const webStyleSymbol = new WebStyleSymbol({
      name: "tear-pin-2",
      styleName: "Esri2DPointSymbolsStyle",
      size : 1
    });

    const trailheadsRenderer = {
      "type": "simple",
      "symbol": webStyleSymbol
    }
  

  const trailheadsLayer = new FeatureLayer({
    url: "https://services2.arcgis.com/NEwhEo9GGSHXcRXV/arcgis/rest/services/Cicloparqueaderos_Certificados_Bogota_D_C/FeatureServer/0",
    outFields: ["NOMBRE_CICP","DIRECCION","CUPOS","TIPOLOGIA_CICP"],
    popupTemplate: popupTrailheads, 
    renderer : trailheadsRenderer,
    /*labelingInfo: [label]*/ 
  });

  map.add(trailheadsLayer,0);

        // Add bikes only trails
        const bikeTrailsRenderer = {
          type: "simple",
          symbol: {
            type: "simple-line",
            style: "short-dot",
            color: "#FF3333",
            width: "8px"
          }
        };
  
        const bikeTrails = new FeatureLayer({
          url:
            "https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/Mapa_Referencia/Mapa_Referencia/MapServer/18",
            
          renderer: bikeTrailsRenderer,
          definitionExpression: "USE_BIKE = 'YES'"
          
        });
  
  map.add(bikeTrails);

  view.on("click", function (event) {
    console.log(event.mapPoint);
    // Si no hay ningun punto, se marca el punto de origen
    if (view.graphics.length === 0) {
      addGraphic("origin", event.mapPoint); // Se llama al metodo addGraphic
    // Si ya hay un punto,entonces se marca el punto de destino y se calcula la ruta
    } else if (view.graphics.length === 1) {
      addGraphic("destination", event.mapPoint);
      getRoute(); // Call the route service
      // De lo contrario se eliminan cualquier grafico para empezar desde cero
      // y se añade un nuevo punto de origen 
    } else {
      view.graphics.removeAll();
      addGraphic("origin", event.mapPoint);
    }
  });

  // Función que añade un punto blanco para el punto de origen
  // un punto negro para el punto de destino

  function addGraphic(type, point) {
    // Se crea el objeto grafico que irá en la vista del mapa
    const graphic = new Graphic({
      symbol: {
        type: "simple-marker",
        color: type === "origin" ? "white" : "black", // si type == origin es blanco, sino (destino) negro 
        size: "8px", 
      },
      geometry: point,
    });
    view.graphics.add(graphic);
  }

  function getRoute() {
    //Se crea el obj "routeParams" 
    //se le pasa las caracteristicas(stops) desde "view.graphics.toArray()"
    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: view.graphics.toArray(),
      }),
      // Retorna direcciones
      returnDirections: true,
    });

    //Metodo "solve" de "route" que obtiene la ruta
    // recibe el servicio de rutas y recibe routeParams el cual contiene los stops
    route
      .solve(routeUrl, routeParams)  
      .then(function (data) { //promesa que espera a data proveniente de solve
        //console.log(data);
        //console.log(data.routeResults);
        // Solo hay una iteración 
        //porque solo calcula una ruta
        data.routeResults.forEach(function (result) { 
          // Configuración total de la linea de ruta!!!!
          result.route.symbol = { 
            type: ["simple-line"], // Tipo de geomatria
            color: [51, 170, 255], // color 
            width: 3, // ancho
          };

          // Se añade la ruta al mapa 
          view.graphics.add(result.route);
        });

        // Display directions
        // Si hay por lo menos una ruta (en este caso solo 1), entonces ;
        if (data.routeResults.length > 0) {
          const directions = document.createElement("ol");
          directions.classList =
            "esri-widget esri-widget--panel esri-directions__scroller";
          directions.style.marginTop = "0";
          directions.style.padding = "15px 15px 15px 30px";
          const features = data.routeResults[0].directions.features;

          // Show each direction
          features.forEach(function (result, i) {
            const direction = document.createElement("li");
            direction.innerHTML =
              result.attributes.text +
              " (" +
              result.attributes.length.toFixed(2) +
              " miles)";
            directions.appendChild(direction);
          });

          view.ui.empty("top-right");
          view.ui.add(directions, "top-right");
        }
        
      })
      .catch(function (error) {
        console.log(error);
      });
      
  }


});