/*
This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.
*/

define(['jquery', 'jquery_ui', 'rmm', 'localise', 'globals'],
		function($, jquery_ui, rmm, localise, globals) {
	
	var graph;
	var surveyList;
	var selected = [];
	var selectedPath;
	
	var svg,
		svgNodes,
		svgLinks,
		simulation,
		color,
		duration = 500,
		theElement,
		theWidth,
		theHeight;
		
	
	return {
		
		showModel: showModel,
		convertMetaToGraph: convertMetaToGraph,
		getPath: getPath
	}
	
	/*
	 * Create a graph from the survey meta data
	 * Styling
	 *  Survey: color
	 *  Selected Form: Large Circle
	 *  Form: Small Circle
	 *  Path: dark link thick
	 *  Parent child link: thick
	 *  Other survey link: thin
	 *  Unselectable forms: low opacity
	 */
	function convertMetaToGraph(meta) {
		var i,
			node,
			link,
			surveys = {};
		
		graph = {
				  "nodes":[],
				  "links":[]
				    };
		
		for(i = 0; i < meta.forms.length; i++) {
			node = {
					id: meta.forms[i].f_id,
					survey: meta.forms[i].s_id,
					name: meta.forms[i].form,
					main: meta.forms[i].p_id == 0 ? true : false,
					p_id: meta.forms[i].p_id,
					selected: isFormSelected(meta.forms[i].f_id)
			}
			graph.nodes.push(node);		
			
			// Add link between parent / child forms
			if(+meta.forms[i].p_id != 0) {
				link = {
						source: meta.forms[i].f_id,
						target: meta.forms[i].p_id,
						sourceQuestionId: 0,
						value: 2
				}
				graph.links.push(link);	
			} else {
				surveys[meta.forms[i].s_id] = meta.forms[i].f_id;	// Save the top level form for the survey
			}
		}
		
		// Add links between surveys
		for(i = 0; i < meta.links.length; i++) {
			link = {
					source: meta.links[i].fromFormId,
					target: surveys[meta.links[i].toSurveyId],
					sourceQuestionId: meta.links[i].fromQuestionId,
					toQuestionId: meta.links[i].toQuestionId,
					value: 1
			}
			graph.links.push(link);	
		}
		
		surveyList = meta.surveys;
		
		showModel('#extsvg', 200, 200)
		
		if(selected.length == 2) {
			setPath();
			update();
		}
	}
	
	/*
	 * Show model of selectable forms including those from linked surveys
	 */
	function showModel(element) {
		
		var $elem = $(element);	
		var width = $elem.width();
		var height = $elem.height();
		
		if(graph.nodes.length === 0) {
			$(element).empty().append("<h1 class='center'>" + localise.set["msg_nf"] + "</h1>");
			$('#export').next().find("button:contains('Export')").addClass("ui-state-disabled");
			return;
		}
		
		$('#export').next().find("button:contains('Export')").removeClass("ui-state-disabled");
		
		theElement = element;
		theWidth = width;
		theHeight = height;
		color = d3.scaleOrdinal(d3.schemeCategory20);

		simulation = d3.forceSimulation()
	    	.force("link", d3.forceLink().id(function(d) { return d.id; }))
	    	.force("charge", d3.forceManyBody())
	    	.force("center", d3.forceCenter(width / 2, height / 2));
		
		update();

	}
	
	/*
	 * Get the path and return undefined if it has not been set
	 */
	function getPath() {
		
		var formList = undefined,
			form,
			i;
		
		if(graph.nodes.length === 1) {
			
			formList = [];
			form = {
				sId: graph.nodes[0].survey,
				fId: graph.nodes[0].id
			}
			formList.push(form);
			
		} else if(selectedPath) {
			formList = [];
			for(i = 0; i < selectedPath.length; i++) {
				form = {
					sId: getFormDetails(selectedPath[i]).survey,
					fId: selectedPath[i]
				}
				/*
				 * Add the questionFrom identifier
				 * At this point we don't know if the list is going parent child or from child to parent
				 *  hence look for the target form before and after the current form
				 */
				// 
				if(i < selectedPath.length - 1) {
					form.fromQuestionId = getFromQuestionId(selectedPath[i], selectedPath[i + 1]);
					form.toQuestionId = getToQuestionId(selectedPath[i], selectedPath[i + 1]);
				}
				if(!form.fromQuestionId && i > 0) {
					form.fromQuestionId = getFromQuestionId(selectedPath[i], selectedPath[i - 1]);
					form.toQuestionId = getToQuestionId(selectedPath[i], selectedPath[i - 1]);
				}
				formList.push(form);
			}
		} else if(selected.length === 1) {
			formList = [];
			form = {
					sId: getFormDetails(selected[0]).survey,
					fId: selected[0]
				}
			formList.push(form);
		}
		
		// Put the form list in order of parent - child
		if(formList.length > 1) {
			// Check the first form, it is a parent if:
			//  it is the "main" form and there is no fromQuestionId
			//  or it is a child and the next forms parent id is equal to its form if
			var formDetails = getFormDetails(formList[0].fId),
				nextFormDetails = getFormDetails(formList[1].fId);
			if((formDetails.main && !formList[0].fromQuestionId) || nextFormDetails.p_id ==  formList[0].fId) {
				// Already in parent child order
			} else {
				formList.reverse();
			}		
		}
		return formList;
	}
		
	/*
	 * Functions for d3
	 */
	function update() {
		
		var $elem = $(theElement);	
		$elem.empty();
		
		// Get dynamic widths of container
		var width = $elem.width();
		var height = $elem.height();
		
		svg = d3.select(theElement).append("svg")
	    	.attr("width", width)
	    	.attr("height", height);
		
		svgLinks = svg.append("g").attr("class", "links");
		svgNodes = svg.append("g").attr("class", "nodes");
		
		var link = svgLinks
	    	.selectAll("line")
	    	.data(graph.links)
	    	.enter().append("line")
	    		.attr("stroke", function(d) { return d.value > 5 ? "red" : "blue"})
	    		.attr("stroke-width", function(d) { return Math.sqrt(d.value); });

		var nodeGroup = svgNodes
	    	.selectAll("circle")
	    	.data(graph.nodes)
	    	.enter().append("g");
		
		var node = nodeGroup
	    	.append("circle")
	    		.attr("r", function(d) {return d.main ? 10 : 5;})
	    		.attr("fill", function(d) { return color(d.survey); })
	    		.attr("stroke",  "blue")
	    		.attr("stroke-width", function(d) { return d.selected ? 2 : 0; })
	    		.on("click", click)
	    		.call(d3.drag()
	    				.on("start", dragstarted)
	    				.on("drag", dragged)
	    				.on("end", dragended));
		
		var text = nodeGroup.append("text")
        	 .attr("dx", 4)
        	 .attr("dy", ".35em")
        	.text(function(d) { return d.main ? "" : d.name });
		
		node.append("title")
	      .text(function(d) { return d.id; });
		
		simulation
	      .nodes(graph.nodes)
	      .on("tick", ticked);
	   
		simulation
			.force("link")
	    	.links(graph.links)
	    	.distance(120);	
		
		/*
		 * Legend
		 */
		var legend = svg.selectAll(".legend")
	      .data(surveyList)
	      .enter().append("g")
		      .attr("class", "legend")
		      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
		
		legend.append("rect")
	      .attr("x", width - 18)
	      .attr("width", 18)
	      .attr("height", 18)
	      .style("fill", function(d) { return color(d.sId); });
		
		legend.append("text")
	      .attr("x", width - 24)
	      .attr("y", 9)
	      .attr("dy", ".35em")
	      .style("text-anchor", "end")
	      .text(function(d) { return d.name; });
		
	  function ticked() {
	    link
	        .attr("x1", function(d) { return d.source.x; })
	        .attr("y1", function(d) { return d.source.y; })
	        .attr("x2", function(d) { return d.target.x; })
	        .attr("y2", function(d) { return d.target.y; });
	
	    node
	        .attr("cx", function(d) { return d.x; })
	        .attr("cy", function(d) { return d.y; });
	    
	    text
        	.attr("x", function(d) { return d.x + 10 })
        	.attr("y", function(d) { return d.y; });
		}
	}
  
	function click(d) {
		
		// Make sure the node is marked as selected if it is in the list
		for(i = 0; i < selected.length; i++) {
			if(selected[i] == d.id) {
				d.selected = true;
			}
		}
		
		if(!d.selected) {
			addSelected(d.id);
		} else {
			removeSelected(d.id);
		}
		d.selected = !d.selected;
		update();
	}
	
	function dragstarted(d) {
		  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		  d.fx = d.x;
		  d.fy = d.y;
		}

	function dragged(d) {
	  d.fx = d3.event.x;
	  d.fy = d3.event.y;
	}

	function dragended(d) {
	  if (!d3.event.active) simulation.alphaTarget(0);
	  d.fx = null;
	  d.fy = null;
	}
	
	function addSelected(nodeId) {
		selected.push(nodeId);
		console.log("Selected: " + selected.join());
		
		if(selected.length == 2) {
			setPath();
		}
	}
	
	function removeSelected(nodeId) {
		var i;
		for(i = 0; i < selected.length; i++) {
			if(selected[i] == nodeId) {
				selected.splice(i,1);
			}
		}
		console.log("Selected: " + selected.join());
		
		if(selected.length !== 2) {
			for(i = 0; i < graph.links.length; i++) {
				graph.links[i].value = 2;
			}
		}
	}
	
	/*
	 * Other functions
	 */
	function getFormDetails(fId) {
		var i;
		for(i = 0; i < graph.nodes.length; i++) {
			if(graph.nodes[i].id == fId) {
				return graph.nodes[i];
			}
		}
	}
	
	function getFromQuestionId(fSource, fTarget) {
		var i;
		for(i = 0; i < graph.links.length; i++) {
			if(graph.links[i].source.id == fSource && graph.links[i].target.id == fTarget) {
				return graph.links[i].sourceQuestionId;
			}
		}
		return 0;
	}
	
	function getToQuestionId(fSource, fTarget) {
		var i;
		for(i = 0; i < graph.links.length; i++) {
			if(graph.links[i].source.id == fSource && graph.links[i].target.id == fTarget) {
				return graph.links[i].toQuestionId;
			}
		}
		return 0;
	}
	
	function isFormSelected(fId) {
		var i;
		if(selected) {
			for(i = 0; i < selected.length; i++) {
				if(selected[i] == fId) {
					return true;
				}
			}
		}
		return false;
	}
	
	/*
	 * Get the from question 
	 */
	
	function setPath() {
		var current = selected[0],
			end = selected[1],
			paths = {},
			links = [],
			count = 0,
			i;
		
		paths[current] = [];
		paths[current].push(current);
		
		while(count++ < 20) {
			if(addPaths(paths, end)) {
				break;
			}
		}
		if(paths[end]) {
			selectedPath = paths[end];
			console.log("path: " + selectedPath.join());
			for(j = 0; j < selectedPath.length - 1; j++) {
				for(i = 0; i < graph.links.length; i++) {
					var sourceId = +graph.links[i].source.id;
					var targetId = +graph.links[i].target.id;
					
					if((sourceId === selectedPath[j] && targetId === selectedPath[j + 1]) ||
							(targetId === selectedPath[j] && sourceId === selectedPath[j + 1])) {
						graph.links[i].value = 10;
					}
				}
			}
		} else {
			selectedPath = undefined;
			alert("Error: could not find a path between the forms");
		}
		
	}
	
	function addPaths(paths, end) {
		
		var path,
			pathId;
		
		for(pathId in paths) {
			if (paths.hasOwnProperty(pathId)) {
				
				console.log("    pathId: " + pathId);
				path = paths[pathId];
				lastForm = +path[path.length - 1];
				
				for(i = 0; i < graph.links.length; i++) {
					var sourceId = +graph.links[i].source.id;
					var targetId = +graph.links[i].target.id;
					if(sourceId === lastForm) {
						
						var newPath = path.slice();
						newPath.push(targetId);
						paths[targetId] = newPath;
						if(targetId === end) {
							return true;
						}
					} else if(targetId === lastForm) {
						var newPath = path.slice();
						newPath.push(sourceId);
						paths[sourceId] = newPath;
						if(sourceId === end) {
							return true;
						}
					}
				}
			}
		}
		return false;
		
	}
});