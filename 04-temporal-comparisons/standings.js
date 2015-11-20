/* Constants for our drawing area */
var width = 750,
    height = 500,
    margin = { top: 20, right: 20, bottom: 70, left:70 };

var parseDate = d3.time.format("%Y-%m-%d").parse;
var formatDate = d3.time.format("%b %d");

var x = d3.time.scale().range([margin.left, width - margin.right]);
var y = d3.scale.linear().range([height - margin.bottom, margin.top]);

var xAxis = d3.svg.axis().scale(x).orient("bottom")
  .ticks(d3.time.weeks, 1)
  .tickFormat(formatDate);
var yAxis = d3.svg.axis().scale(y).orient("left");

var pointLine = d3.svg.line()
  .x(function(d) { return x(d.date); })
  .y(function(d) { return y(d.leaguePoints); });

var colors24 = [
  "#393b79","#5254a3","#6b6ecf","#9c9ede",
  "#3182bd","#6baed6","#9ecae1","#c6dbef",
  "#e6550d","#fd8d3c","#fdae6b","#fdd0a2",
  "#31a354","#74c476","#a1d99b","#c7e9c0",
  "#756bb1","#9e9ac8","#bcbddc","#dadaeb",
  "#843c39","#ad494a","#d6616b","#e7969c"
];

var gameDiv = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

/* The drawing area */
var svg = d3.select("#standings-chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

/* Our standard data reloading function */
var reload = function() {
  d3.json("eng2-2013-14.json", function(results) {

    results.forEach(function(d) { d.Date = parseDate(d.Date); });

    x.domain([results[0].Date, results[results.length-1].Date]);
    y.domain([0, 100]);

    data = d3.merge(
      results.map(function(d) {
        d.Games.forEach(function(g) { g.Date = d.Date; });
        return d.Games;
      })
    );

    var dataMap = d3.map();
    d3.merge([
      d3.nest().key(function(d) { return makeId(d.Away); }).entries(data),
      d3.nest().key(function(d) { return makeId(d.Home); }).entries(data)
    ]).forEach(function(d) {
      if (dataMap.has(d.key)) {
        dataMap.set(d.key, d3.merge([dataMap.get(d.key), d.values])
          .sort(function(a,b) { return d3.ascending(a.Date, b.Date); }));
      } else {
        dataMap.set(d.key, d.values);
      }
    });

    dataMap.forEach(function(key, values) {
      var games = [];
      values.forEach(function(g, i) {
        games.push(gameOutcome(key, g, games));
      });
      dataMap.set(key, games);
    });

    redraw(dataMap);
  })
};

/* Our standard graph drawing function */
var redraw = function(data) {
  var lines = svg.selectAll('.line-graph')
    .data(data.entries());

  lines.enter()
    .append("g");

  lines.sort( function(a, b) {
    var aPoints = a.value[a.value.length-1].leaguePoints;
    var bPoints = b.value[b.value.length-1].leaguePoints;
    return d3.descending(aPoints, bPoints);
  });

  lines.each(function(d, i) {
    d3.select(this)
      .style("stroke", colors24[i])
      .attr("class", "line-graph")
      .attr("transform", "translate("+xAxis.tickPadding()+", 0)")
      .attr("id", d.key)
      .attr("data-legend-" + ((i < 16)? 1:2), d.value[0].team);
  });

  var path = lines.append("path")
    .datum(function(d) { return d.value; })
    .attr("d", function(d) { return pointLine(d); });

  var circles = lines.selectAll("circle")
    .data(function(d) { return d.value; });

  circles.enter()
    .append("circle")
    .attr("r", 3);

  circles.each(function(d) {
    var color = d3.select(this.parentElement).style("stroke");
    d3.select(this)
      .attr("cx", x(d.date))
      .attr("cy", y(d.leaguePoints))
      .style("fill", color)
      .on("mouseover", function(e) { return showGame(d, color); })
      .on("click", function(e) { return showGame(d, color); })
      .on("mouseout", function(e) { return hideGame(); });
  });

  var axis = svg.selectAll(".axis")
    .data( [{axis:xAxis, x:0, y:y(0), clazz:"x"},
            {axis:yAxis, x:x.range()[0], y:0, clazz:"y"}] );

  axis.enter().append("g")
    .attr("class", function(d) { return "axis " + d.clazz; })
    .attr("transform", function (d) {
      return "translate("+d.x+","+d.y+")";
    });

  axis.each(function(d) {
    d3.select(this).call(d.axis);
  });

  axis.selectAll(".x.axis text")
    .style("text-anchor", "end")
    .attr({dx: "-0.8em", transform: "rotate(-65)"});

  var legends = svg.selectAll(".legend")
    .data([{dx:margin.left + 20, dy:y(95)},
           {dx:margin.left + 220, dy:y(95)}]);

  legends.enter()
    .append("g")
    .attr("class", "legend");

  legends.each(function(d, i) {
    d3.select(this)
      .attr("transform", "translate("+d.dx+","+d.dy+")")
      .call(d3.legend, "data-legend-"+(i+1));
  })
};

function gameOutcome(teamId, game, games) {
  var isAway = (makeId(game.Away) === teamId);
  var goals = isAway? +game.AwayScore : +game.HomeScore;
  var allowed = isAway? +game.HomeScore : +game.AwayScore;
  var decision = (goals > allowed)? 'win' : (goals < allowed)? 'loss' : 'draw';
  var points = (goals > allowed)? 3 : (goals < allowed)? 0 : 1;

  return {
    date: game.Date,
    team: isAway? game.Away : game.Home,
    align: isAway? 'away' : 'home',
    opponent: isAway? game.Home : game.Away,
    goals: goals,
    allowed: allowed,
    venue: game.Venue,
    decision: decision,
    points: points,
    leaguePoints: d3.sum(games, function(d) { return d.points; }) + points
  };
}

function makeId(string) {
  return string.replace(/[^A-Za-z0-9]/g, '');
}

function showGame(d, color) {
  gameDiv.transition()
    .duration(20)
    .style("opacity", 0)
    .style("background-color", "white")

  gameDiv
    .html(d.team + "(" + formatDate(d.date) + " - " + d.align + ")<br/>"
          + "Versus: " + d.opponent + "<br/>"
          + "Venue: " + d.venue + "<br/>"
          + "Results: " + d.goals + " - " + d.allowed + " " + d.decision + "<br/>"
          + "Points: " + d.leaguePoints
         )
    .style({left:(d3.event.pageX + 10) + "px",
            top:(d3.event.pageY - 40) + "px"
    })
    .transition()
    .duration(200)
    .style("opacity", 0.9)
    .style("background-color", color);
}

function hideGame() {
  gameDiv.transition()
    .duration(500)
    .style("opacity", 0)
    .style("background-color", "white");
}

reload();

