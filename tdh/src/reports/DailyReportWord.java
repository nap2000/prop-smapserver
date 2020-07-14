package reports;

import java.io.IOException;

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

import java.sql.Connection;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.SDDataSource;


@Path("/report/word")
public class DailyReportWord extends Application {

	Authorise a = new Authorise(null, Authorise.ORG);

	private static Logger log =
			Logger.getLogger(DailyReportWord.class.getName());


	@GET
	@Produces("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	public Response getMonthly (@Context HttpServletRequest request,
			@Context HttpServletResponse response) {

		String connectionString = "tdh - daily report";

		// Authorisation - Access
		Connection sd = SDDataSource.getConnection(connectionString);	
		a.isAuthorised(sd, request.getRemoteUser());		
		// End Authorisation 

		try {
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(sd, request, request.getRemoteUser()));
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);

			XWPFDocument doc = new XWPFDocument();
			XWPFParagraph p1 = doc.createParagraph();

			p1.setWordWrapped(true);
			p1.setSpacingAfterLines(1);

			XWPFRun r1 = p1.createRun();
			String t1 = "Sample Paragraph Post. is a sample Paragraph post. peru-duellmans-poison-dart-frog.";
			r1.setText(t1);
			r1.setText("");
			r1.setText("");

			//create table
			XWPFTable table = doc.createTable();
			table.setWidth("100.00%");

			//create first row
			XWPFTableRow tableRowOne = table.getRow(0);
			tableRowOne.getCell(0).setText("col one, row one");
			tableRowOne.addNewTableCell().setText("col two, row one");
			tableRowOne.addNewTableCell().setText("col three, row one");


			// write to a docx file
			GeneralUtilityMethods.setFilenameInResponse("report.docx", response);
			ServletOutputStream fo = null;
			try {
				// create .docx file
				fo = response.getOutputStream();

				// write to the .docx file
				doc.write(fo);
			} finally {
				if (fo != null) {try {fo.close();} catch (IOException e) {}}
				if (doc != null) {try {doc.close();} catch (IOException e) {}}
			}

		}  catch (Exception e) {
			log.log(Level.SEVERE, "Exception", e);
		} finally {

			SDDataSource.closeConnection(connectionString, sd);	

		}
		return Response.ok("").build();
	}


}
