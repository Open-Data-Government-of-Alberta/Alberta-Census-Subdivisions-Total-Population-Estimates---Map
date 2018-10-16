const log = console.log;

//----------- Loading Data
const dataFiles = [
    "alberta_census_subdivisions(2001-2017).csv",
    "alberta-mapper-topo.json"
];
const PromiseWrapper = function(d, file) {
    return new Promise(function(resolve) {
        d3[file](d, function(p) { resolve(p); });
    });
};
const promises = dataFiles.map(file => {
    const fileType = file.split(".")[1];
    return PromiseWrapper(file, fileType);
});
//----------- Loading Data

//Echarts Instance
const myChart = echarts.init(document.getElementById("main"), "custom-essos");

//Call back after files are Loaded
Promise.all(promises).then((resolve) => mapFunc(resolve));

function mapFunc(allData) {
    
    //Data from loaded files
    const csv = allData[0];
    const json = allData[1];

    //Fix Náre name
    //Convert Year, Sex, and Total to ints
    csv.forEach(element => {
        if(element["Area Name"] === "Thabacha N�re 196A") element["Area Name"] = "Thabacha Náre 196A";

        csv.columns.forEach(d => {
            if(d !== "Area Name") element[d] = parseInt(element[d]);
        });
    });

    //Each year has areanames and corresponding data
    const years = d3.nest().key(d => d["Year"]).key(d => d["Area Name"]).entries(csv);
    //Used this for rapid prototyping
    // const years = d3.range(0, 2).map(p => d3.nest().key(d => d["Year"]).key(d => d["Area Name"]).entries(csv)[p]);

    //---Using topojson of the subdivisions 
    const geojson = topojson.feature(json, json.objects["alberta-mapper"]);
    const features = geojson.features;
    const searchFeatures = d3.map(features, d => d.id);
    //---Using topojson of the subdivisions 

    //---------------- Variables for echarts option
    const searchYears = d3.map(years, d => d.key);
    const titleName = "Alberta Census Subdivisions Total Population Estimates";
    const scatterData = years.map(d => {
        const values = d.values.map(p => {
            const areaName = p.key;
            const feature = searchFeatures.get(areaName);
            const value = p.values[0]["Total"];
            
            return {
                name: areaName,
                value: d3.geoCentroid(feature).concat(value)
            };
        });

        return {key: d.key, values: values};
    });
    const settings = {options: "2001"};
    const defaultYearData = scatterData[years.indexOf(searchYears.get(settings.options))].values;
    const searchDefaultYear = d3.map(defaultYearData, d => d.name);
    //---------------- Variables for echarts option

    //For Dat.GUI
    const yearVals = years.map(d => d.key);
    const gui = new dat.GUI();

    //----------------Echarts options, attributes for building the visualization
    const option = {
        title: {
            text: `${titleName} ${settings.options}`
        },
        toolbox: {
            feature: {
                restore: {},
                saveAsImage: {},
                myTool1: {
                    show: true,
                    title: "Hide Bar Chart",
                    icon: "path://M432.45,595.444c0,2.177-4.661,6.82-11.305,6.82c-6.475,0-11.306-4.567-11.306-6.82s4.852-6.812,"+
                           "11.306-6.812C427.841,588.632,432.452,593.191,432.45,595.444L432.45,595.444z M421.155,589.876c-3.009,"+
                           "0-5.448,2.495-5.448,5.572s2.439,5.572,5.448,5.572c3.01,0,5.449-2.495,5.449-5.572C426.604,592.371,424.165,"+
                           "589.876,421.155,589.876L421.155,589.876z M421.146,591.891c-1.916,0-3.47,1.589-3.47,3.549c0,1.959,1.554,3.548,"+
                           "3.47,3.548s3.469-1.589,3.469-3.548C424.614,593.479,423.062,591.891,421.146,591.891L421.146,591.891zM421.146,591.891",
                    onclick: () => {
                        myChart.setOption({
                            yAxis : {
                                data: []
                            },
                            xAxis: {},
                            title: {},
                            series: {
                                id: "bar",
                                data: []
                            }
                        }); 
                    }
                }
            },
            iconStyle: {
                normal: {
                    borderColor: "black"
                },
                emphasis: {
                    borderColor: "red"
                }
            }
        },
        brush: {
            outOfBrush: {
                color: "#abc"
            },
            brushStyle: {
                borderWidth: 2,
                color: "rgba(0,0,0,0.2)",
                borderColor: "rgba(0,0,0,0.5)",
            },
            seriesIndex: [0, 1],
            throttleType: "debounce",
            throttleDelay: 300,
            geoIndex: 0
        },
        tooltip: { 
            trigger: "item",
            formatter: params => `${params.name} : ${searchDefaultYear.get(params.name).value[2].toLocaleString()}`
        },
        geo: {
            map: "Alberta",
            roam: true,
            zoom: 3.7,
            center: [-109.2, 55],
            itemStyle: {
                emphasis: {
                    areaColor: "lightgray",
                    borderColor: "gray"
                }  
            }
        },
        xAxis: {
            show: false,
            type: "value",
            scale: true
        },
        yAxis: {
            type: "category",
            name: "Top 30 (Maximum) Census Subdivisions",
            nameGap: 16,
            axisLine: {show: false, lineStyle: {color: "gray"}},
            axisTick: {show: false, lineStyle: {color: "gray"}},
            axisLabel: {interval: 0, textStyle: {color: "gray"}},
            data: []
        },
        legend: {
            orient: "vertical",
            top: "bottom",
            left: "right",
            data:["Population"],
            textStyle: {
                color: "gray"
            }
        },
        visualMap: {
            type: "piecewise",
            min: 0,
            max : d3.max(defaultYearData, d => d.value[2]),
            splitNumber: 3,
            textStyle: {color: "gray"},
            color: ["#ff7f00","#984ea3","#4daf4a"],
            formatter: (value, value2) => `${parseInt(value).toLocaleString()} - ${parseInt(value2).toLocaleString()}`
        },
        grid: {
            right: 40,
            top: 100,
            bottom: 40,
            width: "30%",
        },
        series: [
            {
                id: "geoScatter",
                name: "Population",
                type: "scatter",
                coordinateSystem: "geo",
                symbolSize: 7,
                label: {
                    normal: {
                        show: false
                    }
                },
                itemStyle: {
                    emphasis: {
                        borderColor: "#fff",
                        borderWidth: 1
                    }
                },
                data: defaultYearData
            },
            {
                id: "bar",
                zlevel: 2,
                type: "bar",
                symbol: "none",
                label: {
                    show: true,
                    position: "right",
                    fontSize: 9.25,
                    formatter: params => searchDefaultYear.get(params.name).value[2].toLocaleString()
                },
                data: []
            }
        ]
    };
    //----------------Echarts options, attributes for building the visualization

     //Without this, when you hover on the map, the whole map is selected
    features.forEach(d => d.properties.name = d.id);    
    echarts.registerMap("Alberta", geojson);

    gui.add(settings, "options", yearVals);

    //Set Echarts options attributes
    myChart.setOption(option);

    //---------------------For updating the data using the dropdown menu
    //---------------------For now used d3 I don't know how to use dat.gui to update the data
    d3.select("div > select").on("change.custom", function() {
        const selectedYear = d3.select(this).node().value;
        const fetchedData = scatterData[years.indexOf(searchYears.get(selectedYear))].values;
        const searchSelectedNames = d3.map(fetchedData, d => d.name);
        
        myChart.setOption({
            tooltip: {
                formatter: params => `${params.name} : ${searchSelectedNames.get(params.name).value[2].toLocaleString()}`
            },
            title: {
                text: `${titleName} ${selectedYear}`
            },
            visualMap: {
                min: 0,
                max : d3.max(fetchedData, d => d.value[2])
            },
            series: {
                id: "geoScatter",
                data: fetchedData
            },
            series: {
                id: "bar", 
                label: {
                    formatter: params => searchSelectedNames.get(params.name).value[2].toLocaleString()
                }
            }
        });
    });
    //---------------------For updating the data using the dropdown menu

    //Programatically close dat.gui, it's open by default
    d3.select("div > div.close-button.close-bottom").dispatch("click");
    
    myChart.on("brushselected", renderBrushed);

    //----------------------------For creating horizontal bar chart during brush selection
    function renderBrushed(params) {
        const geoScatterSeries = params.batch[0].selected[0];
        const dataIndexes = geoScatterSeries.dataIndex;
        const selectedItems = [];
        const categoryData = [];
        const barData = [];
        const maxBar = 30;

        if(dataIndexes.length == 0) {
            return;
        }
        if(dataIndexes.length !== 0) {
            dataIndexes.forEach(d => {
                const dataItem = option.series[0].data[d];
                selectedItems.push(dataItem);
            });

            selectedItems.sort((a, b) => b.value[2] - a.value[2]);

            for (var i = 0; i < Math.min(selectedItems.length, maxBar); i++) {
                categoryData.push(selectedItems[i].name);
                barData.push(selectedItems[i].value[2]);
            };

            this.setOption({
                yAxis : {
                    data: categoryData.reverse()
                },
                xAxis: {},
                title: {},
                series: {
                    id: "bar",
                    data: barData.reverse()
                }
            });                    
        };
    };
    //----------------------------For creating horizontal bar chart during brush selection
};