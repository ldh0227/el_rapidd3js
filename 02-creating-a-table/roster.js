
/* Creating a table
 *
 * This script shall create a table from a tab-separated value text document.
 */

/* Store the data in an array. Starts off empty.
 * This is usually NOT global, but making global here for demonstration purposes.
 */
var data = [];
var positions = {
  G:"Goalkeeper",
  D:"Defender",
  M:"Midfielder",
  F:"Forward"
};
var columns = ["No", "Name", "Team", "Pos"];
var teams = [];

/* Select the DIV in the document with the ID of "roster".
 * Append a <table class="table"></table> to the selected DIV.
 * The "table" class is a beautification measure via Bootstrap's CSS.
 * The resulting table element is stored in the variable "table."
 */
var table = d3.select('#roster')
  .append('table')
  .classed('table',true);

/* Append <thead><tr></tr></thead> to the above table.
 * The inner tr element is stored in the "thead" variable.
 */
var thead = table.append('thead').append('tr');

/* Append <tbody></tbody> to the table and store it in the "tbody" variable. */
var tbody = table.append('tbody');

var teamSelector = d3.select('#page-title')
  .append('select')
  .on("change", function () { selectTeam(this.value); })
  .attr('id', 'team-selector');

/* Function to reload the data from the data file.
 * Call the redraw() function after the data is loaded to drive the drawing of the data.
 * We'll be filling this in during the lesson.
 */
var reload = function() {
  d3.tsv('eng2-rosters.tsv', function(rows) {
    data = rows;
    data.forEach(function(d) {
      d.Pos = positions[d.Pos];
      if ( teams.indexOf(d.TeamID) < 0 ) {
        teams.push(d.TeamID);
        teams[d.TeamID] = d.Team;
      };
    });

    teamSelector.selectAll("options")
      .data(teams)
      .enter()
      .append("option")
      .attr("value", function(d) { return d; })
      .text(function(d) { return teams[d]; })
      .sort(function(a,b) { return d3.ascending(a,b); });

    selectTeam("afc-wimbledon");
  });
};

/* Function to redraw the table.
 * It's good practice to keep the data input and drawing funcitons separate.
 * We'll be filling this in during the lesson.
 */
var redraw = function(roster) {
  thead.selectAll("th")
    .data(columns)
    .enter()
    .append("th")
    .on("click", function(d) {
      tbody.selectAll("tr")
        .sort( function(a, b) {
          return (d === "No")
            ? d3.ascending(+a[d], +b[d])
            : d3.ascending(a[d], b[d]);
        }).style('background-color', function (d, i) {
          return (i%2)? 'white':'lightgray';
        });
    })
  .text(function(d) { return d; });

  var rows = tbody.selectAll("tr")
    .data(roster);
  rows.enter().append("tr")
    .style('background-color', function (d, i) {
      return (i%2)? 'white':'lightgray';
    });
  rows.exit().remove();
  var cells = rows.selectAll("td")
    .data(function(row) {
      var values = [];

      columns.forEach( function(d) { values.push(row[d]); });
      return values;
  });
  cells.enter().append("td");
  cells.text(function(d) { return d; });
};

var selectTeam = function(teamId) {
  var roster = data.filter(function(d) {
    return d['TeamID'] == teamId;
  });
  d3.select("#team-name").text(teams[teamId] + " Roster");
  document.getElementById("team-selector").value = teamId;
  redraw(roster);
};

/* Call reload() once the page and script have loaded to get the controller script started. */
reload();
