package odataApi;

import java.io.IOException;
import java.util.ArrayList;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataHttpHandler;
import org.apache.olingo.server.api.ServiceMetadata;
import org.apache.olingo.server.api.edmx.EdmxReference;

import model.DemoEdmProvider;
import model.DemoEntityCollectionProcessor;

public class Odata extends HttpServlet {
	 private static final long serialVersionUID = 1L;

	  protected void service(final HttpServletRequest req, final HttpServletResponse resp) throws ServletException, IOException {
	    try {
	      // create odata handler and configure it with CsdlEdmProvider and Processor
	      OData odata = OData.newInstance();
	      ServiceMetadata edm = odata.createServiceMetadata(new DemoEdmProvider(), new ArrayList<EdmxReference>());
	      ODataHttpHandler handler = odata.createHandler(edm);
	      handler.register(new DemoEntityCollectionProcessor());

	      // let the handler do the work
	      handler.process(req, resp);
	    } catch (RuntimeException e) {
	      throw new ServletException(e);
	    }
	  }
}
