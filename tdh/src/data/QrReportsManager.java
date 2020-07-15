package data;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ResourceBundle;
import java.util.logging.Logger;

import javax.imageio.ImageIO;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.managers.LogManager;
import org.smap.sdal.model.Form;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;


import managers.ConfigManager;
import model.QrReportsConfig;
import model.ReportColumn;

public class QrReportsManager {

	private static Logger log =
			Logger.getLogger(QrReportsManager.class.getName());

	LogManager lm = new LogManager();		// Application log
	
	private ResourceBundle localisation = null;
	private String tz;

	public QrReportsManager(ResourceBundle l, String tz) {
		localisation = l;
		if(tz == null) {
			tz = "UTC";
		}
		this.tz = tz;
	}

	public void getQrReport(
			Connection sd, 
			Connection cResults, 
			HttpServletResponse response,
			String filename,
			QrReportsConfig config) throws SQLException, ApplicationException, IOException, WriterException, InvalidFormatException {

		PreparedStatement pstmt = null;
		ResultSet rs = null;
		
		XWPFDocument doc = new XWPFDocument();
		ConfigManager cm = new ConfigManager(localisation);
		
		try {
			
			int sId = GeneralUtilityMethods.getSurveyId(sd, config.sIdent);
			Form tlf = GeneralUtilityMethods.getTopLevelForm(sd, sId);
			String surveyName = GeneralUtilityMethods.getSurveyName(sd, sId);
	
			String escapedFileName = null;
			try {
				escapedFileName = URLDecoder.decode(filename, "UTF-8");
				escapedFileName = URLEncoder.encode(escapedFileName, "UTF-8");
			} catch (UnsupportedEncodingException e1) {
				e1.printStackTrace();
			}

			escapedFileName = escapedFileName.replace("+", " "); // Spaces ok for file name within quotes
			escapedFileName = escapedFileName.replace("%2C", ","); // Commas ok for file name within quotes
			GeneralUtilityMethods.setFilenameInResponse(escapedFileName + "." + "xlsx", response); // Set file name
			
			/*
			 * Validate report configuration
			 * This is required for security as much as error reporting
			 */
			for(ReportColumn rc : config.columns) {
				cm.validateColumn(cResults, tlf.tableName, rc.column, surveyName);
			}
			
			/*
			 * Create query
			 */
			StringBuilder sb = new StringBuilder("select ");
			int idx = 0;
			for(ReportColumn rc : config.columns) {
				if(idx++ > 0) {
					sb.append(",");
				}
				sb.append(rc.column);
			}
	
			sb.append(" from ").append(tlf.tableName);
			
			// page the results to reduce memory usage
			pstmt = cResults.prepareStatement(sb.toString());
			cResults.setAutoCommit(false);		
			pstmt.setFetchSize(100);	
			
			log.info("Get qr report data: " + pstmt.toString());
			rs = pstmt.executeQuery();
			
			XWPFParagraph p1 = doc.createParagraph();
			p1.setWordWrapped(true);
			p1.setSpacingAfterLines(1);
			XWPFRun r1 = p1.createRun();
			String t1 = "Sample Paragraph Post. is a sample Paragraph post. peru-duellmans-poison-dart-frog.";
			r1.setText(t1);
			r1.addBreak();
			r1.setText("");

			int bcWidth = 100;
			int bcHeight = 100;
			QRCodeWriter qrCodeWriter = new QRCodeWriter();
			
			//create table
			XWPFTable table = doc.createTable();
			table.setWidth("100.00%");
			
			int rowNumber = 0;
			while(rs.next()) {
				XWPFTableRow tableRow = null;
			
				if(rowNumber == 0) {
					tableRow = table.getRow(rowNumber);
				} else {
					tableRow = table.createRow();
				}
				rowNumber++;
				
				idx = 0;
				for(ReportColumn rc : config.columns) {
					XWPFTableCell cell = tableRow.getCell(idx++);
					if(cell == null) {
						cell = tableRow.createCell();
					}
					
					String value = rs.getString(rc.column);
					if(value == null) {
						value = "";
					}
						
					XWPFParagraph paragraph = cell.getParagraphArray(0);
					if(paragraph == null) {
						paragraph = cell.addParagraph();
					}
					XWPFRun run = paragraph.createRun();
					paragraph.setAlignment(ParagraphAlignment.LEFT);
					if(rc.qrCode) {
						
						BitMatrix matrix = qrCodeWriter.encode(value, BarcodeFormat.QR_CODE, 100, 100);
						BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);

						ByteArrayOutputStream os = new ByteArrayOutputStream();
						ImageIO.write(image, "png", os);
						InputStream is = new ByteArrayInputStream(os.toByteArray());
						    
						run.addPicture(is, XWPFDocument.PICTURE_TYPE_PNG, null, Units.toEMU(bcWidth), Units.toEMU(bcHeight)); 
						is.close();
						os.close();
					} else {
						run.setText(value);
						run.setBold(true);
					}
					

				}
			}
			
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
            
			
			cResults.setAutoCommit(true);		// End paging
			
		} finally {
			
			if(rs != null) {try {rs.close();} catch(Exception ex) {}} 
			if(pstmt != null) {try {pstmt.close();} catch(Exception ex) {}} 
		}

	}
	
}
