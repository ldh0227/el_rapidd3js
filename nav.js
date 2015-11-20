d3.csv('/nav.csv', function(data) {
  d3.select("body")
    .insert("nav", ":first-child")
    .attr("class", "navbar navbar-default")
    .attr("role", "navigation")
    .append("div")
      .classed("container-fluid", true)
      .append("ul")
        .classed("nav", true)
        .classed("navbar-nav", true)
        .selectAll("li")
        .data(data)
        .enter()
        .append("li")
          .classed("active", function(d) {
            return location.pathname.indexOf(d.code) >= 0;
          })
          .append("a")
            .attr("href", function(d) { return d.href; })
            .text(function(d) { return d.label; })
});
