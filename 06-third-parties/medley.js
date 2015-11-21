var width = 750,
    height = 500,
    radius = Math.min(width, height) / 2;

var leaderScale = d3.scale.linear().range([10, 60]);
var rScale = d3.scale.linear().domain([0,4]).range([0,radius]);
var myScale = [0, rScale(1.5), rScale(3.5), rScale(3.75), rScale(4)];
var fill = d3.scale.category20();

var sunburst = d3.select("#top-scorers").append("svg")
  .attr("width", width)
  .attr("height", height * 1.04)
  .append("g")
  .attr("transform", "translate(" + width / 2 + "," + height * .52 + ")");

var infoBox = d3.select("#top-scorers svg")
  .append("g")
  .attr("transform", "translate(" + ((width/2) - rScale(1.1)) + "," + ((height/2) - rScale(.2)) + ")")
  .append("text")
  .style("font-size", "12px");

var partition = d3.layout.partition()
  .sort(null)
  .size([2 * Math.PI, radius * radius])
  .value(function (d) { return 1; })
  .children( function(d) {
    //console.log(d);
    return d.children? d.children :
           d.entries ? d.entries() :
           d.text? null :
           d.value.length?
           d.value : d.value.entries();
  });

var arc = d3.svg.arc()
  .startAngle(function (d) { return d.x; })
  .endAngle(function (d) { return d.x + d.dx; })
  .innerRadius(function (d) { return myScale[d.depth]; })
  .outerRadius(function (d) { return myScale[d.depth + 1]; });

d3.tsv("stats.tsv", function (data) {
  var leaders = data
    .filter(function (d) { return +d.G > 0; })
    .map(function (d) { return { text: d.Name, size: +d.G, goals: +d.G, team: d.Team, pos: d.Pos }; })
    .sort(function (a, b) { return d3.descending(a.size, b.size); })
    .slice(0, 100);

  var leadersByTeamPos = d3.nest()
    .key(function (d) { return d.team; })
    .key(function (d) { return d.pos; })
    .map(leaders, d3.map);

  leaderScale
    .domain([d3.min(leaders, function (d) { return d.size; }),
             d3.max(leaders, function (d) { return d.size; }) ]);

  var layout = d3.layout.cloud()
    .size([width, height])
    .words(leaders)
    .padding(0)
    //.rotate(function() { return ~~(Math.random() * 2) * 90; })
    .font("Impact")
    .fontSize(function (d) { return leaderScale(d.size); })
    .on("end", drawCloud)
    .start();

  drawSunburst(leadersByTeamPos);
});

function drawCloud(words) {
  d3.select("#word-cloud").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .selectAll("text")
    .data(words)
    .enter().append("text")
    .style("font-size", function (d) { return d.size + "px"; })
    .style("font-family", "Impact")
    .style("fill", function (d, i) { return fill(i); })
    .attr("text-anchor", "middle")
    .attr("transform", function (d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
    .text(function (d) { return d.text; });
}

function drawSunburst(data) {
  var g = sunburst.datum(data).selectAll("path")
    .data(partition.nodes)
    .enter().append("g")
    .attr("display", function (d) { return d.depth ? null : "none"; });
  
  var path = g.append("path")    
    .attr("d", arc)
    .style("stroke", "#fff")
    .style("fill", function (d) { return fill(d.children ? d.key : d.text); })
    .style("fill-rule", "evenodd")
    .on("mouseover", function(d) { writeInfo(d); })
    .on("click", function(d) { writeInfo(d); })
    .each(stash);

  var text = g.filter(function(d) { return d.depth < 3; })
    .append("text")
    .style("fill", "white")
    .style("font-size", "10px");
  
  text.each(function(d) {
    var radius = myScale[d.depth];
    var angle = calcAngle(d.x, d.dx);
    var margin = (d.depth == 2)? 8:5;
    margin *= (angle > 90)? -1:1;
    var anchor = (d.depth == 2)? "middle" : (angle > 90)? "end" : "start";
    d3.select(this)
      .attr("dx", margin)
      .attr("dy", ".38em")
      .attr("transform", "rotate(" + angle + ")translate(" + radius + ")rotate(" + ((angle > 90)? -180 : 0) + ")")
      .attr("text-anchor", anchor)
      .text(d.key)
  });
  
  d3.selectAll("input").on("change", function change() {
    var value = this.value === "count"
      ? function () { return 1; }
      : function (d) { return d.goals; };

    path
      .data(partition.value(value).nodes)
      .transition()
      .duration(1500)
      .attrTween("d", arcTween);
    
    text.each(function(d) {
      var radius = myScale[d.depth];
      var angle = calcAngle(d.x, d.dx);
      var margin = (d.depth == 2)? 8:5;
      margin *= (angle > 90)? -1:1;
      var selection = d3.select(this);
      var anchor = selection.attr("text-anchor");
      selection
        .transition()
        .duration(1500)
        .attr("dx", margin)        
        .attr("transform", "rotate(" + angle + ")translate(" + 
              ((anchor == "start" && angle > 90)
                ? (radius + this.getBBox().width)
                : radius) +
              ")rotate(" + (angle > 90 ? 180 : 0) + ")");
    });
  });
}

// Stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

// Interpolate the arcs in data space.
function arcTween(a) {
  var i = d3.interpolate({ x: a.x0, dx: a.dx0 }, a);
  return function (t) { var b = i(t); a.x0 = b.x; a.dx0 = b.dx; return arc(b); };
}

function writeInfo(d) {
  var positions = {
    G:"Goalkeeper",
    D:"Defender",
    M:"Midfielder",
    F:"Forward"
  };
  
  var team = pos = name = goals = "";
  switch(d.depth) {
    case 3: name = d.text; goals = "" + d.goals + " goals"; d = d.parent;
    case 2: pos = positions[d.key]; d= d.parent;
    case 1: team = d.key;
    default: break;
  }
  
  var tspan = infoBox.selectAll("tspan")
    .data([team, pos, name, goals]);
  
  tspan.enter()
    .append("tspan")
    .attr("x", "0")
    .attr("y", function(d, i) { return "" + (i * 1.4) + "em"; });
  
  tspan.text(function(d) { return d; });
}

function calcAngle(x, dx) {
  return (x + (dx / 2)) * 180 / Math.PI - 90;
}