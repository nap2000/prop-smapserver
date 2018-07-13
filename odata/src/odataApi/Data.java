package odataApi;
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

import java.util.ArrayList;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;

import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataHttpHandler;
import org.apache.olingo.server.api.ServiceMetadata;
import org.apache.olingo.server.api.edmx.EdmxReference;

import model.DemoEdmProvider;
import model.DemoEntityCollectionProcessor;


/*
 * Provides access to collected data
 */
@Path("/scv")
public class Data extends Application {
	
	@GET
	@Path("/scv")
	public Response getData(@Context HttpServletRequest request, @Context HttpServletResponse response) { 
		Response r = null;
		try {
		      // create odata handler and configure it with CsdlEdmProvider and Processor
		      OData odata = OData.newInstance();
		      ServiceMetadata edm = odata.createServiceMetadata(new DemoEdmProvider(), new ArrayList<EdmxReference>());
		      ODataHttpHandler handler = odata.createHandler(edm);
		      handler.register(new DemoEntityCollectionProcessor());

		      // let the handler do the work
		      handler.process(request, response);
		      r = Response.ok("").build();
		    } finally {
		    	
		    }
		return r;
	}



}

